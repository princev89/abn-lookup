export type Result = {
  abn: string;
  legal_name: string;
  state: string;
  postcode?: string;
  entity_type?: string;
  gst_registered?: boolean;
};

export type EntityDetail = Result & { businessNames?: string[] };

export type FilterOptions = {
  entity_type: string[];
  states: string[];
};
