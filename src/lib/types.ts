export type WaitlistStatus = "waiting";

export interface WaitlistEntry {
  id: string;
  name: string;
  group_size: number;
  phone: string;
  status: WaitlistStatus;
  created_at: string;
}

export interface NewWaitlistEntry {
  name: string;
  group_size: number;
  phone: string;
}

export interface SeatedRecord extends WaitlistEntry {
  seated_at: string;
}
