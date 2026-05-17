export type AlertChannel = 'email' | 'slack';
export type AlertStatus = 'sent' | 'failed' | 'pending';

export interface Alert {
  id: string;
  anomaly_id: string;
  channel: AlertChannel;
  sent_at: string | null;
  status: AlertStatus;
  error_message?: string | null;
}
