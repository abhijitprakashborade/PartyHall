from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime
from django.utils import timezone
from typing import List, Dict, Any

# Module-level defaults – used ONLY if the hall record somehow lacks these fields
_DEFAULT_GAP_FEE_PER_HOUR = Decimal("200.00")  # Rs200/hr
_DEFAULT_DISCOUNT_PCT      = Decimal("10.00")   # 10%
_DEFAULT_EXTRA_GUEST_FEE   = Decimal("500.00")  # Rs500/guest


class PriceCalculator:
    """
    Dynamic pricing service for Party Hall bookings.

    Handles:
    - Per-slot package pricing  (package.price x num_slots)
    - Multi-slot discount       (rate set per-hall by partner, default 10%)
    - Gap holding fee           (rate set per-hall by partner, default Rs200/hr)
    - Extra guest fee           (rate set per-hall by partner, default Rs500/guest)
    - Add-on services
    """

    @staticmethod
    def calculate_duration_hours(start_time: Any, end_time: Any) -> float:
        """Calculates duration between two time objects in hours."""
        def parse_time(t_str):
            for fmt in ("%H:%M:%S", "%H:%M"):
                try:
                    return datetime.strptime(t_str, fmt).time()
                except ValueError:
                    continue
            raise ValueError(f"Time data '{t_str}' does not match any known format")

        if isinstance(start_time, str):
            start_time = parse_time(start_time)
        if isinstance(end_time, str):
            end_time = parse_time(end_time)

        start_min = start_time.hour * 60 + start_time.minute
        end_min   = end_time.hour * 60 + end_time.minute
        duration_min = end_min - start_min
        if duration_min <= 0:
            return 1.0
        return max(1.0, duration_min / 60.0)

    @classmethod
    def calculate_total(
        cls,
        hall: Any,
        start_time: Any,
        end_time: Any,
        guest_count: int,
        selected_addons: List[Any] = None,
        addon_quantities: dict = None,
        package: Any = None,
        duration_hours_override: float = None,
        slot_count: int = 1,
        gap_hours: float = 0,
        same_event: bool = True,
        num_event_segments: int = 1,
    ) -> Dict[str, Any]:
        """
        Independent backend price calculation (security handshake).

        All pricing RATES are read from the hall object so partners can customise:
          hall.gap_fee_per_hour          (default 200)
          hall.multi_slot_discount_pct   (default 10 -> 10%)
          hall.extra_guest_fee_per_head  (default 500)

        slot_count:         how many 1-hour slots the user selected
        gap_hours:          total idle hours between non-consecutive slots
        same_event:         True  → one continuous event (gap holding fee, addons once)
                            False → separate events (no gap fee, addons/guests × segments)
        num_event_segments: number of separate consecutive groups (only used when same_event=False)
        """
        if addon_quantities is None:
            addon_quantities = {}
        slot_count = max(1, int(slot_count))
        num_event_segments = max(1, int(num_event_segments))

        # --- Pull partner-configurable rates from the hall -----------------------
        gap_fee_per_hour = Decimal(str(
            getattr(hall, 'gap_fee_per_hour', _DEFAULT_GAP_FEE_PER_HOUR)
        ))
        discount_pct = Decimal(str(
            getattr(hall, 'multi_slot_discount_pct', _DEFAULT_DISCOUNT_PCT)
        ))
        extra_guest_fee = Decimal(str(
            getattr(hall, 'extra_guest_fee_per_head',
                    getattr(hall, 'extra_guest_fee', _DEFAULT_EXTRA_GUEST_FEE))
        ))
        discount_rate = (discount_pct / Decimal("100")).quantize(Decimal("0.0001"))

        # --- 1. Base / Package Price (per slot) ----------------------------------
        if package:
            package_unit_price = Decimal(str(package.price))
            package_subtotal   = package_unit_price * slot_count
        else:
            duration = (duration_hours_override
                        if duration_hours_override
                        else cls.calculate_duration_hours(start_time, end_time))
            package_unit_price = Decimal(str(hall.hourly_rate))
            package_subtotal   = package_unit_price * Decimal(str(duration))

        # --- 2. Multi-slot discount (only for same_event — separate events are billed independently) ---
        if slot_count > 1 and package and discount_rate > 0 and same_event:
            multi_slot_discount = (package_subtotal * discount_rate).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
        else:
            multi_slot_discount = Decimal("0.00")

        package_total_after_discount = package_subtotal - multi_slot_discount

        # --- 3. Extra Guest Fee --------------------------------------------------
        effective_base_cap = package.max_people if package else (
            hall.base_capacity if hall.base_capacity is not None else 10
        )
        extra_guests      = max(0, guest_count - effective_base_cap)
        extra_guest_total = Decimal(str(extra_guests)) * extra_guest_fee
        # For separate events: each event has its own guest list → multiply by segments
        if not same_event and num_event_segments > 1:
            extra_guest_total = extra_guest_total * num_event_segments

        # --- 4. Add-ons ----------------------------------------------------------
        addons_total  = Decimal("0.00")
        addon_details = []
        if selected_addons:
            for addon in selected_addons:
                quantity   = int(addon_quantities.get(str(addon.id), 1))
                # For separate events: each event needs its own set of add-ons
                effective_qty = quantity * (num_event_segments if not same_event else 1)
                line_total = Decimal(str(addon.price)) * effective_qty
                addons_total += line_total
                addon_details.append({
                    'id': str(addon.id),
                    'name': addon.name,
                    'price': float(addon.price),
                    'quantity': effective_qty,
                    'base_quantity': quantity,
                    'num_event_segments': num_event_segments if not same_event else 1,
                    'line_total': float(line_total),
                })

        # --- 5. Gap Holding Fee ---------------------------------------------------
        # same_event=True  → hall is held during the gap → charged
        # same_event=False → gap is between truly separate events → NOT charged
        gap_hours_decimal = Decimal(str(max(0, gap_hours)))
        if same_event:
            gap_holding_fee = (gap_hours_decimal * gap_fee_per_hour).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
        else:
            gap_holding_fee = Decimal("0.00")

        # --- 6. Grand Total ------------------------------------------------------
        grand_total = (
            package_total_after_discount
            + extra_guest_total
            + addons_total
            + gap_holding_fee
        )

        actual_duration = duration_hours_override if duration_hours_override else float(slot_count)

        return {
            # Package breakdown
            'package_unit_price':       float(package_unit_price),
            'slot_count':               slot_count,
            'package_subtotal':         float(package_subtotal),
            'multi_slot_discount':      float(multi_slot_discount),
            'multi_slot_discount_pct':  float(discount_pct),   # so UI can show "X% off"
            'package_total':            float(package_total_after_discount),

            # Pricing summary
            'base_price':               float(package_total_after_discount),  # legacy compat
            'duration_hours':           actual_duration,
            'package_hours':            package.duration_hours if package else 0,

            # Extras
            'extra_guests':             extra_guests,
            'extra_guest_total':        float(extra_guest_total),
            'extra_guest_fee_per_head': float(extra_guest_fee),

            # Addons
            'addons_total':             float(addons_total),
            'addon_details':            addon_details,

            # Gap fee
            'gap_hours':                float(gap_hours),
            'gap_fee_per_hour':         float(gap_fee_per_hour),  # for UI transparency
            'gap_holding_fee':          float(gap_holding_fee),

            # Event mode context (for UI display)
            'same_event':               same_event,
            'num_event_segments':       num_event_segments,

            # Final
            'grand_total':              float(grand_total),
            'currency':                 'INR',
        }
