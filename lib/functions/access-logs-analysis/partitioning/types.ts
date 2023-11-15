export interface ColumnTransformationRules {
  readonly [columnName: string]: string | undefined;
}

export interface TransformPartitionEvent {
  readonly columnNames: string[];
  readonly columnTransformations: ColumnTransformationRules;
}
