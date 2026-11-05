export interface RevenueCatWebhookEvent {
  event: {
    id: string;
    type: RevenueCatEventType;
    app_user_id: string;
    original_app_user_id?: string;
    product_id?: string;
    purchased_at_ms?: number;
    expiration_at_ms?: number;
    is_trial_conversion?: boolean;
    [key: string]: any;
  };
}

export type RevenueCatEventType =
  | 'INITIAL_PURCHASE'
  | 'RENEWAL'
  | 'PRODUCT_CHANGE'
  | 'CANCELLATION'
  | 'BILLING_ISSUE'
  | 'NON_RENEWING_PURCHASE'
  | 'UNCANCELLATION'
  | 'TRANSFER'
  | 'SUBSCRIPTION_PAUSED'
  | 'EXPIRATION'
  | 'SUBSCRIPTION_EXTENDED'
  | 'INVOICE_ISSUANCE'
  | 'TEMPORARY_ENTITLEMENT_GRANT'
  | 'REFUND_REVERSED';
