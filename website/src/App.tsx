import {
  ProviderInstanceContext,
  useRegisterChildInstance,
  ChildInstanceContext,
  useProviderInstance,
  useChildInstanceContextState,
  useChildInstanceContext
} from "@carefrees/table-async-validator"
import { Table, Form, Button, Input, Tooltip, Popconfirm, } from "antd"
import type { TableProps } from "antd"
import { useMemo } from "react"

interface TableNameStateRowType {
  name: string
  age: number
  rowId: string
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


const RenderCellInput = (props: { rowData: TableNameStateRowType, field: keyof TableNameStateRowType }) => {
  const { rowData, field } = props

  const [state, errorState, childInstance] = useChildInstanceContextState<TableNameStateRowType>()
  const rowId = rowData.rowId;
  const value = state?.[rowId]?.[field];
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
]

function ChildTable(props: {
  name: keyof TableNameState,
  onChange?: (value: TableNameStateRowType[]) => void,
  value?: TableNameStateRowType[],
}) {
  const { name, onChange, value } = props
  const { childInstance } = useRegisterChildInstance<TableNameState>(name)
  childInstance.rowKey = 'rowId'
  useMemo(() => {
    childInstance.rules = {
      name: [{ required: true, message: '请输入姓名' }],
      age: [{ required: true, message: '请输入年龄' }],
    }
  }, [childInstance])

  const onDeleteRow = (rowKey: string) => {
    childInstance.deleteRowData(rowKey)
    if (onChange) {
      onChange(value?.filter((item) => item.rowId !== rowKey) || [])
    }
  }
  childInstance.onDeleteRow = onDeleteRow
  return <ChildInstanceContext.Provider value={childInstance}>
    <div>
      <Table
        size="small"
        rowKey='rowId'
        columns={columns}
        dataSource={value}
        pagination={false}
      />
      <Button
        onClick={() => {
          const result = childInstance.addRowData({ name: '', age: 0, })
          if (onChange) {
            onChange([...(value || [])].concat([result._item]))
          }
        }}
      >新增一行</Button>
    </div>
  </ChildInstanceContext.Provider>
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
    } catch (error) {
      console.log('error', error)
    }
  }

  return (
    <ProviderInstanceContext.Provider value={providerInstance}>
      <Form form={form}>
        <Form.Item name="1" label="1" rules={[{ required: true, message: '请输入' }]} >
          <Input />
        </Form.Item>
        <Form.Item name="a" label="a" >
          <ChildTable name="a" />
        </Form.Item>
        <Form.Item name="b" label="b" >
          <ChildTable name="b" />
        </Form.Item>
      </Form>
      <Button type="primary" onClick={onClickSubmit} >提交</Button>
    </ProviderInstanceContext.Provider>
  );
};

export default App;
