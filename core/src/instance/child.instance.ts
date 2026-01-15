/**
 * 子级
*/
import { proxy, useSnapshot, ref } from "valtio"
import AsyncValidator, { RuleItem, ValidateError, ValidateFieldsError, Values } from 'async-validator';
import { createContext, useRef, useContext } from "react"
import type { ChildInstanceValidateAllResult, MObject } from "./interface";

/**子项实例*/
export class ChildInstance<T extends MObject<T> = object> {
  /**命名空间*/
  namespace: PropertyKey = ''
  /**行主键字段*/
  rowKey: string = 'rowId'
  /**
   * 行数据的主键值，对应一行中字段的存储数据
  */
  state = proxy<Record<string, T>>({})
  /**
   * 行数据的主键值，对应一行中所有列的错误信息
  */
  errorState = proxy<Record<string, Record<string, string[]>>>({})
  /**是否初始化*/
  private isCtor = false
  /**原始数据列表(未初始化时存储数据)*/
  _o_dataList: T[] = []
  /**最新的列表渲染数据(每一次传入的数据)*/
  _last_dataList: Record<string, string | number>[] = []
  /**
   * 初始化值(建议进行深度拷贝，避免直接引用导致数据存在问题)
  */
  ctor = (data: T[] = []) => {
    this._last_dataList = [...data]
    if (this.isCtor) {
      return data
    }
    const initList: Record<string, string | number>[] = []
    this._o_dataList = [...data]
    this._last_dataList = []
    if (Array.isArray(data)) {
      const _data = [...data]
      while (_data.length) {
        const item = _data.shift()
        if (item) {
          this._last_dataList.push({ [this.rowKey]: item[this.rowKey] })
          initList.push({ [this.rowKey]: item[this.rowKey] })
          this.state[item[this.rowKey]] = { ...item }
        }
      }
    }
    this.isCtor = true
    return initList
  }
  // ===================================================挂载参数================================================================
  /**
   * 行数据删除时触发,由外部挂载事件
   * @param rowKey 行主键值
  */
  onDeleteRow: (rowKey: string) => void = () => void 0;
  // ===================================================挂载参数================================================================

  // ===================================================行数据处理================================================================
  /**
   * 更新行数据
   * @param rowKey 行主键值
   * @param objectData 更新数据对象
   * @param isValidate 是否验证(可选)
  */
  updatedRowData = (rowKey: string, objectData: Partial<T>, isValidate: boolean = true) => {
    if (!this.state[rowKey]) {
      this.state[rowKey] = {} as T
    }
    const keys = Object.keys(objectData)
    for (let index = 0; index < keys.length; index++) {
      const field = keys[index];
      this.state[rowKey][field] = objectData[field]
      if (isValidate) {
        this.validate(this.state[rowKey], [field], false)
      }
    }
    return this
  }

  /**
   * 更新数据，并指定验证字段
   * @param rowKey 行主键值
   * @param objectData 更新数据对象
   * @param fields 验证字段(需要把当前更新字段一起放入)
  */
  updatedRowDataAndValidate = (rowKey: string, objectData: Partial<T>, fields: string[]) => {
    this.updatedRowData(rowKey, objectData, false)
    this.validate(this.state[rowKey], fields, false)
    return this
  }

  /**新增一行数据
   * @param objectData 初始值
  */
  addRowData = (objectData: Partial<T>) => {
    const rowId = Date.now() + '_' + Math.random().toString(36).substring(2);
    const _item = { [this.rowKey]: rowId, ...objectData } as T
    this.state[rowId] = { ..._item } as T
    return { rowId, _item }
  }
  /**删除一行数据
   * @param rowKey 行主键值
  */
  deleteRowData = (rowKey: string) => {
    delete this.state[rowKey]
    delete this.errorState[rowKey]
    return this
  }
  /**
   * 清理所有数据,并设置成未进行初始化
   * @param isInitProxy 是否初始化为新的proxy对象(可选)
  */
  clear = (isInitProxy?: boolean) => {
    if (isInitProxy) {
      this.state = proxy<Record<string, T>>({})
    } else {
      const keys = Object.keys(this.state)
      for (let index = 0; index < keys.length; index++) {
        const rowKey = keys[index];
        delete this.state[rowKey]
      }
    }
    this.clearErrorInfo(isInitProxy)
    this._o_dataList = []
    this.isCtor = false
    return this
  }
  // ===================================================行数据处理================================================================

  // ===================================================错误信息处理================================================================
  /**
   * 更新行数据的错误信息
   * @param rowKey 行主键值
   * @param objectErrorInfo 行数据错误信息对象
  */
  updatedErrorInfo = (rowKey: string, objectErrorInfo: Record<string, string[]>) => {
    if (!this.errorState[rowKey]) {
      this.errorState[rowKey] = {}
    }
    const keys = Object.keys(objectErrorInfo)
    for (let index = 0; index < keys.length; index++) {
      const field = keys[index];
      this.errorState[rowKey][field] = objectErrorInfo[field]
    }
    return this
  }
  /**
   * 清理错误信息
   * @param rowKey 行主键值
   * @param fields 列字段数组(可选)
  */
  deleteErrorInfo = (rowKey: string, fields?: string | string[]) => {
    if (fields && this.errorState[rowKey]) {
      if (Array.isArray(fields)) {
        for (let index = 0; index < fields.length; index++) {
          const field = fields[index];
          delete this.errorState[rowKey][field]
        }
      } else {
        delete this.errorState[rowKey][fields]
      }
    } else {
      delete this.errorState[rowKey]
    }
    return this
  }
  /**
   * 清理所有错误信息
  */
  clearErrorInfo = (isInitProxy?: boolean) => {
    if (isInitProxy) {
      this.errorState = proxy<Record<string, Record<string, string[]>>>({})
    } else {
      const keys = Object.keys(this.errorState)
      for (let index = 0; index < keys.length; index++) {
        const rowKey = keys[index];
        delete this.errorState[rowKey]
      }
    }
    return this
  }
  // ===================================================错误信息处理================================================================
  // ===================================================规则处理================================================================
  /**列规则 */
  rules: Record<string, ((rowData: T, instance: ChildInstance<T>) => RuleItem[] | Promise<RuleItem[]>) | RuleItem[]> = {}
  /**规则验证
   * @param rowData 行数据对象
   * @param fields 列字段数组(可选)
   * @param isReturn 是否返回验证结果(可选)
  */
  validate = async (rowData: T, fields?: string[], isReturn: boolean = true): Promise<ValidateFieldsError | Values> => {
    let _fields = fields
    const rules: Record<string, RuleItem[]> = {}
    let isNeedValidate = false
    // 没有 fields 值，验证所有
    if (!fields || (Array.isArray(fields) && fields.length === 0)) {
      _fields = Object.keys(this.rules)
    }
    for (let index = 0; index < _fields.length; index++) {
      isNeedValidate = true
      const element = _fields[index];
      const rule = this.rules[element]
      if (typeof rule === 'function') {
        const _rules = await rule(rowData, this)
        rules[element] = _rules
      } else if (Array.isArray(rule)) {
        rules[element] = rule
      }
    }
    if (!isNeedValidate) {
      console.warn('no rules to validate')
      return Promise.resolve({ ...rowData })
    }
    return new Promise((resolve, reject) => {
      new AsyncValidator({ ...rules })
        .validate({ ...rowData }, (errors, fields) => {
          const rowKey = rowData[this.rowKey]
          if (!this.errorState[rowKey]) {
            this.errorState[rowKey] = {}
          }
          for (let index = 0; index < _fields.length; index++) {
            const field = _fields[index];
            const fidError = Array.isArray(errors) ? errors.filter((item) => item.field === field) : undefined
            if (fidError) {
              this.errorState[rowKey][field] = ref(fidError.map((item) => item.message || ''))
            } else {
              delete this.errorState[rowKey][field]
            }
          }
          if (isReturn) {
            if (errors) {
              reject({ errors, fields })
            } else {
              resolve(fields)
            }
          }
        })
    })
  }
  /**验证所有数据
   * @param options.rowKeys 行主键值数组(可选)
   * @param options.fields 列字段数组(可选)
   * @param options.isReject 存在错误时是否使用 Promise.reject 抛出错误(可选)
   * @returns 验证结果
  */
  validateAll = async (options: { rowKeys?: string[], fields?: string[], isReject?: boolean }): Promise<ChildInstanceValidateAllResult<T>> => {
    const { rowKeys, fields, isReject = true } = options
    let _keys = rowKeys
    if (Array.isArray(rowKeys) && rowKeys.length) {
      _keys = rowKeys
    } else {
      _keys = Object.keys(this.state || {})
    }
    let isErrorInfo = false;
    const errorInfo: Record<string, { errors: ValidateError[] | null, fields: ValidateFieldsError | Values, otherError?: any }> = {}
    const dataList: T[] = []
    for (let index = 0; index < _keys.length; index++) {
      const key = _keys[index];
      const rowData = this.state[key];
      try {
        await this.validate(rowData, fields, true);
        dataList.push(rowData)
      } catch (errorData) {
        isErrorInfo = true;
        if (Array.isArray(errorData?.errors) && errorData?.errors?.length && errorData?.fields) {
          errorInfo[key] = errorData
        } else {
          errorInfo[key] = { otherError: errorData, fields: {}, errors: [] }
        }
      }
    }
    if (isErrorInfo && isReject) {
      return Promise.reject({ errorInfo, dataList, isErrorInfo })
    }
    return Promise.resolve({ errorInfo, dataList, isErrorInfo })
  };
  // ===================================================规则处理================================================================

  // ===================================================数据转换================================================================
  // 把数组转换成 主键 => 数据 的对象
  convertArrayToObject = <K extends T = T>(array: K[]) => {
    const object: Record<string, T> = {}
    const list: Record<string, string | number>[] = []
    for (let index = 0; index < array.length; index++) {
      const item = array[index];
      const rowKey = item[this.rowKey]
      object[rowKey] = { ...item }
      list.push({ [this.rowKey]: rowKey })
    }
    return { data: object, list }
  }
  // ===================================================数据转换================================================================
}

/**初始化实例*/
export function useChildInstance<T extends MObject<T> = object>(instance?: ChildInstance<T>) {
  const ref = useRef<ChildInstance<T>>()
  if (!ref.current) {
    if (instance) {
      ref.current = instance
    } else {
      ref.current = new ChildInstance<T>()
    }
  }
  return ref.current
}

/**context*/
export const ChildInstanceContext = createContext<ChildInstance<any>>(new ChildInstance<any>())

/**仅获取实例*/
export function useChildInstanceContext<T extends MObject<T> = object>() {
  return useContext(ChildInstanceContext) as ChildInstance<T>
}

/**获取状态+错误信息+实例*/
export function useChildInstanceContextState<T extends MObject<T> = object>() {
  const instance = useContext(ChildInstanceContext) as ChildInstance<T>
  const state = useSnapshot(instance.state)
  const errorState = useSnapshot(instance.errorState)
  return [state, errorState, instance] as [
    Record<string, T>,
    Record<string, Record<keyof T, string[]>>,
    ChildInstance<T>,
  ]
}
