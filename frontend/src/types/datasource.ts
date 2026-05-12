export type DataSourceType = 'postgres' | 'mysql' | 'bigquery' | 'google_sheets';
export type DataSourceStatus = 'active' | 'inactive' | 'error';

export interface DataSource {
  id: string;
  name: string;
  type: DataSourceType;
  connection_config: Record<string, unknown>;
  status: DataSourceStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateDataSourceRequest {
  name: string;
  type: DataSourceType;
  connection_config: Record<string, unknown>;
  status: DataSourceStatus;
}

export interface UpdateDataSourceRequest {
  name?: string;
  type?: DataSourceType;
  connection_config?: Record<string, unknown>;
  status?: DataSourceStatus;
}
