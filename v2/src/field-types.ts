/**
 * FieldType 定義 - Drizzle ORM ライクな DSL
 */

export interface FieldDefinition {
  type: string;
  nullable: boolean;
  primaryKey: boolean;
  default?: any;
  logicalType?: string;
}

export class BaseFieldType {
  protected definition: FieldDefinition;

  constructor(type: string, logicalType?: string) {
    this.definition = {
      type,
      nullable: true,
      primaryKey: false,
      logicalType,
    };
  }

  notNull(): this {
    this.definition.nullable = false;
    return this;
  }

  primaryKey(): this {
    this.definition.primaryKey = true;
    this.definition.nullable = false;
    return this;
  }

  withDefault(defaultValue: any): this {
    this.definition.default = defaultValue;
    return this;
  }

  getDefinition(): FieldDefinition {
    return { ...this.definition };
  }

  toAvroType(): string | string[] | any {
    const baseType = this.definition.logicalType 
      ? { type: this.definition.type, logicalType: this.definition.logicalType }
      : this.definition.type;

    if (this.definition.nullable) {
      return ['null', baseType];
    }
    return baseType;
  }
}

export class StringFieldType extends BaseFieldType {
  constructor() {
    super('string');
  }
}

export class IntFieldType extends BaseFieldType {
  constructor() {
    super('int');
  }
}

export class LongFieldType extends BaseFieldType {
  constructor() {
    super('long');
  }
}

export class DoubleFieldType extends BaseFieldType {
  constructor() {
    super('double');
  }
}

export class BooleanFieldType extends BaseFieldType {
  constructor() {
    super('boolean');
  }
}

export class UuidFieldType extends BaseFieldType {
  constructor() {
    super('string', 'uuid');
  }
}

export class TimestampFieldType extends BaseFieldType {
  constructor() {
    super('long', 'timestamp-millis');
  }
}

export class DateFieldType extends BaseFieldType {
  constructor() {
    super('int', 'date');
  }
}

export class TimeFieldType extends BaseFieldType {
  constructor() {
    super('int', 'time-millis');
  }
}

export class DecimalFieldType extends BaseFieldType {
  constructor(precision: number = 10, scale: number = 2) {
    super('bytes', 'decimal');
    this.definition.logicalType = 'decimal';
    (this.definition as any).precision = precision;
    (this.definition as any).scale = scale;
  }
}

export class ArrayFieldType extends BaseFieldType {
  constructor(itemType: BaseFieldType) {
    super('array');
    (this.definition as any).items = itemType.toAvroType();
  }
}

export class MapFieldType extends BaseFieldType {
  constructor(valueType: BaseFieldType) {
    super('map');
    (this.definition as any).values = valueType.toAvroType();
  }
}

/**
 * FieldType エクスポート - 設計案の通り（各フィールドは新しいインスタンスを返す）
 */
export const FieldType = {
  get STRING() { return new StringFieldType(); },
  get INT() { return new IntFieldType(); },
  get LONG() { return new LongFieldType(); },
  get DOUBLE() { return new DoubleFieldType(); },
  get BOOLEAN() { return new BooleanFieldType(); },
  get UUID() { return new UuidFieldType(); },
  get TIMESTAMP() { return new TimestampFieldType(); },
  get DATE() { return new DateFieldType(); },
  get TIME() { return new TimeFieldType(); },
  DECIMAL: (precision?: number, scale?: number) => new DecimalFieldType(precision, scale),
  ARRAY: (itemType: BaseFieldType) => new ArrayFieldType(itemType),
  MAP: (valueType: BaseFieldType) => new MapFieldType(valueType),
} as const; 