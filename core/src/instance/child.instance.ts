/**
 * 子级
*/
import { proxy, useSnapshot } from "valtio"
import AsyncValidator, { RuleItem, ValidateError, ValidateFieldsError, Values } from 'async-validator';
import { createContext, useRef, useContext } from "react"
import { ChildInstanceValidateAllResult } from "./interface";

/**子项实例*/
export class ChildInstance<T extends { [K in keyof T]: T[K] } = object> {
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

  // ===================================================挂载参数================================================================
  /**
   * 行数据删除时触发,由外部挂载事件
  */
  onDeleteRow: (rowKey: string) => void = () => void 0;
  // ===================================================挂载参数================================================================

  // ===================================================行数据处理================================================================
  /**
   * 更新行数据
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
  /**新增一行数据*/
  addRowData = (objectData: Partial<T>) => {
    const rowId = Date.now() + '_' + Math.random().toString(36).substring(2);
    const _item = { [this.rowKey]: rowId, ...objectData } as T
    this.state[rowId] = { ..._item } as T
    return { rowId, _item }
  }
  /**删除一行数据*/
  deleteRowData = (rowKey: string) => {
    delete this.state[rowKey]
    delete this.errorState[rowKey]
    return this
  }
  /**
   * 清理所有行数据
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
    return this
  }
  // ===================================================行数据处理================================================================

  // ===================================================错误信息处理================================================================
  /**
   * 更新行数据的错误信息
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
  /**列规则*/
  rules: Record<string, ((rowData: T, instance: ChildInstance<T>) => RuleItem[] | Promise<RuleItem[]>) | RuleItem[]> = {}
  /**规则验证*/
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
      return undefined
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
              this.errorState[rowKey][field] = fidError.map((item) => item.message || '')
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
  /**
   * 直接把数组 转成 主键 => 数据 的对象, 直接存储到 state, 并返回 [ { [主键]:主键值 } ] 格式
  */
  ctorSaveState = <K extends T = T>(array: K[]) => {
    const list: Record<string, string | number>[] = []
    for (let index = 0; index < array.length; index++) {
      const item = array[index];
      const rowKey = item[this.rowKey]
      this.state[rowKey] = { ...item }
      list.push({ [this.rowKey]: rowKey })
    }
    return list
  }
  // ===================================================数据转换================================================================
}

/**初始化实例*/
export function useChildInstance<T extends { [K in keyof T]: T[K] } = object>(instance?: ChildInstance<T>) {
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
export function useChildInstanceContext<T extends { [K in keyof T]: T[K] } = object>() {
  return useContext(ChildInstanceContext) as ChildInstance<T>
}

/**获取状态+错误信息+实例*/
export function useChildInstanceContextState<T extends { [K in keyof T]: T[K] } = object>() {
  const instance = useContext(ChildInstanceContext) as ChildInstance<T>
  const state = useSnapshot(instance.state)
  const errorState = useSnapshot(instance.errorState)
  return [state, errorState, instance] as [
    Record<string, T>,
    Record<string, Record<keyof T, string[]>>,
    ChildInstance<T>,
  ]
}
