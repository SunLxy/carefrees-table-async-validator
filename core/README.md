# 使用 valtio 封装表格异步校验器

## 安装

```bash
npm install @carefrees/table-async-validator # yarn add @carefrees/table-async-validator # pnpm add @carefrees/table-async-validator
```

## 方法

- `ProviderInstance` 父级实例
- `useProviderInstance` 初始化父级实例
- `ProviderInstanceContext` 获取父级实例
- `useProviderInstanceContextState` 获取父级实例状态
- `useProviderInstanceContext` 获取父级实例上下文
- `useRegisterChildInstance` 注册子实例
- `ChildInstance` 子实例
- `useChildInstance` 初始化子实例
- `ChildInstanceContext` 获取子实例上下文
- `useChildInstanceContext` 获取子实例上下文
- `useChildInstanceContextState` 获取子实例状态

## 类型参数

```ts
import { ValidateError } from 'async-validator';
import { ValidateFieldsError } from 'async-validator';
import { RuleItem, ValidateFieldsError, Values } from 'async-validator';
/**子实例验证返回 */
export interface ChildInstanceValidateAllResult<T extends object = object> {
  /**错误信息*/
  errorInfo: Record<
    string,
    {
      errors: ValidateError[] | null;
      fields: ValidateFieldsError | Values;
      otherError?: any;
    }
  >;
  /**成功数据列表*/
  dataList: T[];
  /**是否有错误*/
  isErrorInfo: boolean;
}
/**映射类型，将每个子项的验证结果映射到父项验证结果中*/
export type ProviderInstanceValidateResultMappedType<
  T extends {
    [K in keyof T]: T[K];
  }
> = {
  [K in keyof T]: ({
    name: K;
  } & ChildInstanceValidateAllResult<T[K]>)[];
}[keyof T];
/**父项实例验证结果*/
export interface ProviderInstanceValidateResult<
  T extends {
    [K in keyof T]: T[K];
  }
> {
  /** 没找到实例*/
  nameToNotFound: {
    name: keyof T;
    message: string;
  }[];
  /**有错误实例*/
  nameToErrorInfo: ProviderInstanceValidateResultMappedType<T>;
  /**没有错误实例*/
  nameToSuccessInfo: ProviderInstanceValidateResultMappedType<T>;
}

/**父项实例*/
export declare class ProviderInstance<
  T extends {
    [K in keyof T]: T[K];
  }
> {
  /*** 子实例 */
  childInstanceState: { [K in keyof T]: ChildInstance<T[K]> };
  /**
   * 注册子实例
   */
  register: <M extends keyof T>(
    name: M,
    childInstance: ChildInstance<T[M]>
  ) => void;
  /**
   * 注销子实例
   */
  unregister: (name: keyof T) => void;
  /**调用子项验证
   * @param options.names 子实例名称(可选)
   * @param options.rowKey 行主键值数组(可选)
   * @param options.fields 列字段数组(可选)
   * @param options.isReject 是否使用 Promise.reject 抛出错误(可选)
   * @returns 验证结果
   */
  validate: (options?: {
    names?: (keyof T)[];
    rowKey?: string[];
    fields?: string[];
    isReject?: boolean;
  }) => Promise<ProviderInstanceValidateResult<T>>;
}
/**初始化实例*/
export declare function useProviderInstance<
  T extends {
    [K in keyof T]: T[K];
  }
>(instance?: ProviderInstance<T>): ProviderInstance<T>;
/**context*/
export declare const ProviderInstanceContext: import('react').Context<
  ProviderInstance<any>
>;
/**获取状态+实例*/
export declare function useProviderInstanceContextState<
  T extends {
    [K in keyof T]: T[K];
  }
>(): [{ [K in keyof T]: ChildInstance<T[K]> }, ProviderInstance<T>];
/**仅获取实例*/
export declare function useProviderInstanceContext<
  T extends {
    [K in keyof T]: T[K];
  }
>(): ProviderInstance<T>;
/**注册子实例*/
export declare function useRegisterChildInstance<
  T extends {
    [K in keyof T]: T[K];
  },
  M extends keyof T = keyof T
>(
  name: M
): {
  childInstance: ChildInstance<T[M]>;
  providerInstance: ProviderInstance<T>;
};

/**子项实例*/
export declare class ChildInstance<
  T extends {
    [K in keyof T]: T[K];
  } = object
> {
  /**命名空间*/
  namespace: PropertyKey;
  /**行主键字段*/
  rowKey: string;
  /**
   * 行数据的主键值，对应一行中字段的存储数据
   */
  state: Record<string, T>;
  /**
   * 行数据的主键值，对应一行中所有列的错误信息
   */
  errorState: Record<string, Record<string, string[]>>;
  /**是否初始化*/
  private isCtor;
  /**原始数据列表(未初始化时存储数据)*/
  _o_dataList: T[];
  /**最新的列表渲染数据(每一次传入的数据)*/
  _last_dataList: Record<string, string | number>[];
  /**
   * 初始化值(建议进行深度拷贝，避免直接引用导致数据存在问题)
   */
  ctor: (data?: T[]) => Record<string, string | number>[];
  /**
   * 行数据删除时触发,由外部挂载事件
   * @param rowKey 行主键值
   */
  onDeleteRow: (rowKey: string) => void;
  /**
   * 更新行数据
   * @param rowKey 行主键值
   * @param objectData 行数据对象
   * @param isValidate 是否验证(可选)
   */
  updatedRowData: (
    rowKey: string,
    objectData: Partial<T>,
    isValidate?: boolean
  ) => this;
  /**新增一行数据
   * @param objectData 行数据对象
   */
  addRowData: (objectData: Partial<T>) => {
    rowId: string;
    _item: T;
  };
  /**删除一行数据
   * @param rowKey 行主键值
   */
  deleteRowData: (rowKey: string) => this;
  /**
   * 清理所有数据,并设置成未进行初始化
   * @param isInitProxy 是否初始化为新的proxy对象(可选)
   */
  clear: (isInitProxy?: boolean) => this;
  /**
   * 更新行数据的错误信息
   * @param rowKey 行主键值
   * @param objectErrorInfo 行数据错误信息对象
   */
  updatedErrorInfo: (
    rowKey: string,
    objectErrorInfo: Record<string, string[]>
  ) => this;
  /**
   * 清理错误信息
   * @param rowKey 行主键值
   * @param fields 列字段数组(可选)
   */
  deleteErrorInfo: (rowKey: string, fields?: string | string[]) => this;
  /**
   * 清理所有错误信息
   */
  clearErrorInfo: (isInitProxy?: boolean) => this;
  /**列规则 */
  rules: Record<
    string,
    | ((
        rowData: T,
        instance: ChildInstance<T>
      ) => RuleItem[] | Promise<RuleItem[]>)
    | RuleItem[]
  >;
  /**规则验证
   * @param rowData 行数据对象
   * @param fields 列字段数组(可选)
   * @param isReturn 是否返回验证结果(可选)
   */
  validate: (
    rowData: T,
    fields?: string[],
    isReturn?: boolean
  ) => Promise<ValidateFieldsError | Values>;
  /**验证所有数据
   * @param options.rowKeys 行主键值数组(可选)
   * @param options.fields 列字段数组(可选)
   * @param options.isReject 存在错误时是否使用 Promise.reject 抛出错误(可选)
   * @returns 验证结果
   */
  validateAll: (options: {
    rowKeys?: string[];
    fields?: string[];
    isReject?: boolean;
  }) => Promise<ChildInstanceValidateAllResult<T>>;
  convertArrayToObject: <K extends T = T>(
    array: K[]
  ) => {
    data: Record<string, T>;
    list: Record<string, string | number>[];
  };
}
/**初始化实例*/
export declare function useChildInstance<
  T extends {
    [K in keyof T]: T[K];
  } = object
>(instance?: ChildInstance<T>): ChildInstance<T>;
/**context*/
export declare const ChildInstanceContext: import('react').Context<
  ChildInstance<any>
>;
/**仅获取实例*/
export declare function useChildInstanceContext<
  T extends {
    [K in keyof T]: T[K];
  } = object
>(): ChildInstance<T>;
/**获取状态+错误信息+实例*/
export declare function useChildInstanceContextState<
  T extends {
    [K in keyof T]: T[K];
  } = object
>(): [
  Record<string, T>,
  Record<string, Record<keyof T, string[]>>,
  ChildInstance<T>
];
```

## 基本使用

```tsx
import {
  ProviderInstanceContext,
  useRegisterChildInstance,
  ChildInstanceContext,
  useProviderInstance,
  useChildInstanceContextState,
  useChildInstanceContext,
} from '@carefrees/table-async-validator';

import { Table, Form, Button, Input, Tooltip, Popconfirm } from 'antd';
import type { TableProps } from 'antd';
import { useEffect, useMemo } from 'react';
interface TableNameStateRowType {
  name: string;
  age: number;
  rowId: string;
}

interface TableNameState {
  a: TableNameStateRowType;
  b: TableNameStateRowType;
}

export const RenderCellDelete = (props: any) => {
  const { rowData } = props;
  const childInstance = useChildInstanceContext<TableNameStateRowType>();
  return (
    <Popconfirm
      title='确认删除吗？'
      description='删除后将无法恢复'
      onConfirm={() => {
        childInstance.onDeleteRow(rowData.rowId);
      }}
      okText='确认'
      cancelText='取消'
    >
      <Button danger>Delete</Button>
    </Popconfirm>
  );
};

const RenderCellInput = (props: {
  rowData: TableNameStateRowType;
  field: keyof TableNameStateRowType;
}) => {
  const { rowData, field } = props;
  const [state, errorState, childInstance] =
    useChildInstanceContextState<TableNameStateRowType>();
  // 获取当前行的主键值
  const rowId = rowData.rowId;
  // 获取当前行的列值
  const value = state?.[rowId]?.[field];
  // 获取当前行的列错误信息
  const errorList = errorState?.[rowId]?.[field];

  const errorTip = useMemo(() => {
    if (Array.isArray(errorList) && errorList.length) {
      return (
        <div>
          {errorList.map((item, index) => (
            <div key={index} style={{ color: 'red' }}>
              {item}
            </div>
          ))}
        </div>
      );
    }
    return '';
  }, [errorList]);

  return (
    <Tooltip open={Boolean(errorTip)} title={errorTip} color='white'>
      <div className={errorTip ? 'ant-form-item-has-error' : ''}>
        <Input
          className={errorTip ? 'ant-input-status-error' : ''}
          placeholder={`请输入${field}`}
          value={value}
          onChange={(e) => {
            childInstance.updatedRowData(rowId, { [field]: e.target.value });
          }}
        />
      </div>
    </Tooltip>
  );
};

const columns: TableProps['columns'] = [
  {
    title: '删除',
    dataIndex: 'delete',
    render: (_, rowData: any) => <RenderCellDelete rowData={rowData} />,
  },
  {
    title: '姓名',
    dataIndex: 'name',
    render: (_, rowData: any) => (
      <RenderCellInput rowData={rowData} field='name' />
    ),
  },
  {
    title: '年龄',
    dataIndex: 'age',
    render: (_, rowData: any) => (
      <RenderCellInput rowData={rowData} field='age' />
    ),
  },
];

function ChildTable(props: {
  name: keyof TableNameState;
  onChange?: (value: Record<string, string | number>[]) => void;
  value?: TableNameStateRowType[];
}) {
  const { name, onChange, value } = props;

  /**注册子实例*/
  const { childInstance } = useRegisterChildInstance<TableNameState>(name);
  /**设置行数据的主键值，对应一行中所有列的错误信息*/
  childInstance.rowKey = 'rowId';
  /**数据转换，如果未初始化会进行初始化，如果已经初始化完成，直接返回传入的数据列表*/
  const _value = useMemo(
    () => childInstance.ctor(value),
    [childInstance, value]
  );

  useMemo(() => {
    // 设置校验规则
    childInstance.rules = {
      name: [{ required: true, message: '请输入姓名' }],
      age: [{ required: true, message: '请输入年龄' }],
    };
  }, [childInstance]);

  const onDeleteRow = (rowKey: string) => {
    childInstance.deleteRowData(rowKey);
    if (onChange) {
      onChange(_value?.filter((item) => item.rowId !== rowKey) || []);
    }
  };
  /**挂载删除操作方法*/
  childInstance.onDeleteRow = onDeleteRow;

  useEffect(() => {
    return () => {
      childInstance.clear();
    };
  }, []);

  return (
    <ChildInstanceContext.Provider value={childInstance}>
      <div>
        <Table
          size='small'
          rowKey='rowId'
          columns={columns}
          dataSource={_value}
          pagination={false}
        />
        <Button
          onClick={() => {
            const result = childInstance.addRowData({ name: '', age: 0 });
            if (onChange) {
              onChange([...(_value || [])].concat([{ rowId: result.rowId }]));
            }
          }}
        >
          新增一行
        </Button>
      </div>
    </ChildInstanceContext.Provider>
  );
}

const formData = {
  a: [{ name: 'd', age: 0, rowId: 'a1' }],
};

const App = () => {
  const providerInstance = useProviderInstance<TableNameState>();
  const [form] = Form.useForm();

  const onClickSubmit = async () => {
    try {
      const result = await form.validateFields();
      console.log('result', result);
    } catch (error) {
      console.log('error', error);
    }
    try {
      const result = await providerInstance.validate();
      console.log('result', result);
    } catch (error) {
      console.log('error', error);
    }
  };

  return (
    <ProviderInstanceContext.Provider value={providerInstance}>
      <Form layout='vertical' form={form} initialValues={formData}>
        <Form.Item
          name='1'
          label='输入框1'
          rules={[{ required: true, message: '请输入' }]}
        >
          <Input />
        </Form.Item>
        <Form.Item name='a' label='表格数据a'>
          <ChildTable name='a' />
        </Form.Item>
        <Form.Item name='b' label='表格数据b'>
          <ChildTable name='b' />
        </Form.Item>
      </Form>
      <Button type='primary' onClick={onClickSubmit}>
        提交
      </Button>
    </ProviderInstanceContext.Provider>
  );
};

export default App;
```
