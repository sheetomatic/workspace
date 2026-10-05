import { SHEETOMATIC_RAZORPAY_ME_URL } from "@/lib/payments/razorpay-me";
import "./razorpay-pay-frame.css";

type Props = {
  amountLabel: string;
};

export function RazorpayPayFrame({ amountLabel }: Props) {
  return (
    <div className="rzp-pay">
      <p className="rzp-pay-hint">
        Pay <strong>{amountLabel}</strong> on Razorpay. Enter that amount on the
        page, then complete the payment.
      </p>
      <iframe
        className="rzp-pay-frame"
        src={SHEETOMATIC_RAZORPAY_ME_URL}
        title="Pay Sheetomatic Technologies on Razorpay"
        loading="lazy"
      />
      <a
        className="rzp-pay-open"
        href={SHEETOMATIC_RAZORPAY_ME_URL}
        target="_blank"
        rel="noopener noreferrer"
      >
        Open Razorpay
      </a>
    </div>
  );
}
