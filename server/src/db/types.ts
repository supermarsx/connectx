export interface QueryResult<T = Record<string, unknown>> {
  rows: T[];
  rowCount: number;
}

export type QueryFn = <T = Record<string, unknown>>(
  text: string,
  params?: unknown[],
) => Promise<QueryResult<T>>;

export interface DbProvider {
  query: QueryFn;
  transaction<T>(fn: (query: QueryFn) => Promise<T>): Promise<T>;
  close(): Promise<void>;
  init(schemaPath?: string): Promise<void>;
  healthCheck?(): Promise<boolean>;
}
