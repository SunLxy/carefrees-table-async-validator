import {
  ProviderInstanceContext,
  useRegisterChildInstance,
  ChildInstanceContext,
  useProviderInstance,
  useChildInstanceContextState,
  useChildInstanceContext
} from "@carefrees/table-async-validator"
import { ref } from "valtio"
import { Table, Form, Button, Input, Tooltip, Popconfirm } from "antd"
import type { TableProps } from "antd"
import { useEffect, useMemo } from "react"

interface TableNameStateRowType {
  name: string
  age: number
  rowId: string
  file?: FileList | null
}

interface TableNameState {
  a: TableNameStateRowType,
  b: TableNameStateRowType,
}

export const RenderCellDelete = (props: any) => {
  const { rowData } = props
  const childInstance = useChildInstanceContext<TableNameStateRowType>()
  return <Popconfirm
    title="确认删除吗？"
    description="删除后将无法恢复"
    onConfirm={() => {
      childInstance.onDeleteRow(rowData.rowId)
    }}
    okText="确认"
    cancelText="取消"
  >
    <Button danger>Delete</Button>
  </Popconfirm>
};


const RenderCellInputFile = (props: { rowData: TableNameStateRowType, field: 'file' }) => {
  const { rowData, field } = props
  const [state, errorState, childInstance] = useChildInstanceContextState<TableNameStateRowType>()
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
    return ''
  }, [errorList]);

  console.log(`${field} value: `, value)

  return <Tooltip
    open={Boolean(errorTip)}
    title={errorTip}
    color='white'
  >
    <div className={errorTip ? 'ant-form-item-has-error' : ''}>
      <input
        type="file"
        multiple={true}
        onChange={(e) => {
          const _value = e.target.files
          childInstance.updatedRowData(rowId, { [field]: _value ? ref(_value) : undefined })
        }}
      />
    </div>
  </Tooltip>
}

const RenderCellInput = (props: { rowData: TableNameStateRowType, field: Exclude<keyof TableNameStateRowType, 'file'> }) => {
  const { rowData, field } = props
  const [state, errorState, childInstance] = useChildInstanceContextState<TableNameStateRowType>()
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
    return ''
  }, [errorList]);

  return <Tooltip
    open={Boolean(errorTip)}
    title={errorTip}
    color='white'
  >
    <div className={errorTip ? 'ant-form-item-has-error' : ''}>
      <Input
        className={errorTip ? 'ant-input-status-error' : ''}
        placeholder={`请输入${field}`}
        value={value}
        onChange={(e) => {
          childInstance.updatedRowData(rowId, { [field]: e.target.value })
        }}
      />
    </div>
  </Tooltip>
}

const columns: TableProps['columns'] = [
  {
    title: '删除',
    dataIndex: 'delete',
    render: (_, rowData: any) => <RenderCellDelete rowData={rowData} />,
  },
  {
    title: '姓名',
    dataIndex: 'name',
    render: (_, rowData: any) => <RenderCellInput rowData={rowData} field='name' />,
  },
  {
    title: '年龄',
    dataIndex: 'age',
    render: (_, rowData: any) => <RenderCellInput rowData={rowData} field='age' />,
  },
  {
    title: '文件',
    dataIndex: 'file',
    render: (_, rowData: any) => <RenderCellInputFile rowData={rowData} field='file' />,
  },
]

function ChildTable(props: {
  name: keyof TableNameState,
  onChange?: (value: Record<string, string | number>[]) => void,
  value?: TableNameStateRowType[],
}) {
  const { name, onChange, value } = props

  /**注册子实例*/
  const { childInstance } = useRegisterChildInstance<TableNameState>(name)
  /**设置行数据的主键值，对应一行中所有列的错误信息*/
  childInstance.rowKey = 'rowId'
  /**数据转换，如果未初始化会进行初始化，如果已经初始化完成，直接返回传入的数据列表*/
  const _value = useMemo(() => childInstance.ctor(value), [childInstance, value])

  useMemo(() => {
    // 设置校验规则
    childInstance.rules = {
      name: [{ required: true, message: '请输入姓名' }],
      age: [{ required: true, message: '请输入年龄' }],
    }
  }, [childInstance])

  const onDeleteRow = (rowKey: string) => {
    childInstance.deleteRowData(rowKey)
    if (onChange) {
      onChange(_value?.filter((item) => item.rowId !== rowKey) || [])
    }
  }
  /**挂载删除操作方法*/
  childInstance.onDeleteRow = onDeleteRow

  useEffect(() => {
    return () => {
      childInstance.clear()
    }
  }, [])

  return <ChildInstanceContext.Provider value={childInstance}>
    <div>
      <Table
        size="small"
        rowKey='rowId'
        columns={columns}
        dataSource={_value}
        pagination={false}
      />
      <Button
        onClick={() => {
          const result = childInstance.addRowData({ name: '', age: 0, })
          if (onChange) {
            onChange([...(_value || [])].concat([{ rowId: result.rowId }]))
          }
        }}
      >新增一行</Button>
    </div>
  </ChildInstanceContext.Provider>
}

type PartialTableNameState = {
  [K in keyof TableNameState]?: TableNameState[K][];
};

const formData: PartialTableNameState = {
  a: [{ name: 'd', age: 0, rowId: 'a1' }],
}

const App = () => {
  const providerInstance = useProviderInstance<TableNameState>()
  const [form] = Form.useForm()

  const onClickSubmit = async () => {
    try {
      const result = await form.validateFields()
      console.log('result', result)
    } catch (error) {
      console.log('error', error)
    }
    try {
      const result = await providerInstance.validate()
      console.log('result', result)
      // result.nameToSuccessInfo[0].

    } catch (error) {
      console.log('error', error)
    }
  }

  return (
    <ProviderInstanceContext.Provider value={providerInstance}>
      <Form layout="vertical" form={form} initialValues={formData}>
        <Form.Item name="1" label="输入框1" rules={[{ required: true, message: '请输入' }]} >
          <Input />
        </Form.Item>
        <Form.Item name="a" label="表格数据a" >
          <ChildTable name="a" />
        </Form.Item>
        <Form.Item name="b" label="表格数据b" >
          <ChildTable name="b" />
        </Form.Item>
      </Form>
      <Button type="primary" onClick={onClickSubmit} >提交</Button>
    </ProviderInstanceContext.Provider>
  );
};

export default App;
