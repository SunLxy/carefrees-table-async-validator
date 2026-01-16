/**
 * 子级
*/
import { proxy, useSnapshot, ref } from "valtio"
import AsyncValidator, { RuleItem, ValidateError, ValidateFieldsError, Values } from 'async-validator';
import { createContext, useRef, useContext } from "react"
import type { ChildInstanceValidateAllResult, MObject } from "./interface";
import { copy } from 'fast-copy';

/**子项实例*/
export class ChildInstance<T extends MObject<T> = object> {
  /**命名空间*/
  namespace: PropertyKey = ''
  /**行主键字段*/
  rowKey: PropertyKey = 'rowId'
  /**是否启用操作状态*/
  enableOperationState = false
  /**
   * 行数据的主键值，对应一行中字段的存储数据
  */
  state = proxy<Record<PropertyKey, T>>({})
  /**
   * 行数据的主键值，对应一行中所有列的错误信息
  */
  errorState = proxy<Record<PropertyKey, Record<PropertyKey, string[]>>>({})
  /**操作状态 新增/编辑*/
  operationState = proxy<Record<PropertyKey, 'add' | 'edit'>>({})
  /**临时存储行数据(在编辑时使用，点击编辑之前存储数据，在取消编辑时可以根据存储的数据进行还原)*/
  tempState = proxy<Record<PropertyKey, T>>({})

  /**是否初始化*/
  private isCtor = false
  /**原始数据列表(未初始化时存储数据)*/
  _o_dataList: T[] = []
  /**最新的列表渲染数据(每一次传入的数据)*/
  _last_dataList: Record<PropertyKey, PropertyKey>[] = []

  /**
   * 初始化值
  */
  ctor = (data: T[] = []) => {
    this._last_dataList = [...data]
    if (this.isCtor) {
      return data
    }
    const initList: Record<PropertyKey, PropertyKey>[] = []
    this._o_dataList = copy(data)
    this._last_dataList = []
    if (Array.isArray(data)) {
      const _data = [...data]
      while (_data.length) {
        const item = _data.shift()
        if (item) {
          this._last_dataList.push({ [this.rowKey]: item[this.rowKey] })
          initList.push({ [this.rowKey]: item[this.rowKey] })
          this.state[item[this.rowKey]] = copy({ ...item })
        }
      }
    }
    this.isCtor = true
    return initList
  }

  // ===================================================挂载参数================================================================
  /**新增一行数据时触发,由外部挂载事件
   * @param list 新增数据列表
   * @param rowKey 新增的行主键值
   * @param type 操作类型
  */
  onChangeRows: (list: Record<PropertyKey, PropertyKey>[], rowKey: PropertyKey, type: "add" | "delete") => void = () => void 0;
  // ===================================================挂载参数================================================================

  // ===================================================行数据处理================================================================
  /**
   * 更新行数据
   * @param rowKey 行主键值
   * @param objectData 更新数据对象
   * @param isValidate 是否验证(可选)
  */
  updatedRowData = (rowKey: PropertyKey, objectData: Partial<T>, isValidate: boolean = true) => {
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
  updatedRowDataAndValidate = (rowKey: PropertyKey, objectData: Partial<T>, fields: PropertyKey[]) => {
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
  deleteRowData = (rowKey: PropertyKey) => {
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
      this.state = proxy<Record<PropertyKey, T>>({})
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
  updatedErrorInfo = (rowKey: PropertyKey, objectErrorInfo: Record<PropertyKey, string[]>) => {
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
  deleteErrorInfo = (rowKey: PropertyKey, fields?: PropertyKey | PropertyKey[]) => {
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
      this.errorState = proxy<Record<PropertyKey, Record<PropertyKey, string[]>>>({})
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

  // ===================================================操作状态================================================================
  /**更新操作状态*/
  updatedOperationState = (rowKey: PropertyKey | PropertyKey[], operationState: 'add' | 'edit') => {
    if (Array.isArray(rowKey)) {
      for (let index = 0; index < rowKey.length; index++) {
        const key = rowKey[index];
        this.operationState[key] = operationState
      }
    } else {
      this.operationState[rowKey] = operationState
    }
    return this
  }
  /**移除操作状态*/
  removeOperationState = (rowKey: PropertyKey | PropertyKey[]) => {
    if (Array.isArray(rowKey)) {
      for (let index = 0; index < rowKey.length; index++) {
        const key = rowKey[index];
        delete this.operationState[key]
      }
    } else {
      delete this.operationState[rowKey]
    }
    return this
  }
  /**判断是否存在操作状态数据*/
  isExistOperationState = (rowKeys?: PropertyKey[]) => {
    // 如果 rowKeys 存在值，则判断rowKeys是否存在操作状态，否则直接判断是否存在操作状态的
    let editKeys = []
    let addKeys = []
    if (Array.isArray(rowKeys) && rowKeys.length) {
      editKeys = rowKeys?.filter((item) => this.operationState[item] === 'edit') || []
      addKeys = rowKeys?.filter((item) => this.operationState[item] === 'add') || []
    } else {
      editKeys = Object.keys(this.operationState || []).filter((item) => this.operationState[item] === 'edit') || []
      addKeys = Object.keys(this.operationState || []).filter((item) => this.operationState[item] === 'add') || []
    }
    return { editKeys, addKeys, isExist: editKeys.length > 0 || addKeys.length > 0 }
  }
  // ===================================================操作状态================================================================

  // ===================================================临时存储行数据================================================================
  /**更新临时存储数据*/
  updatedTempState = (rowKey: PropertyKey, objectData: Partial<T>) => {
    this.tempState[rowKey] = ref(copy(objectData) as T)
    return this
  }
  /**移除临时存储数据*/
  removeTempState = (rowKey: PropertyKey) => {
    delete this.tempState[rowKey]
    return this
  }
  /**获取临时存储数据*/
  getTempState = (rowKey: PropertyKey) => {
    return this.tempState[rowKey]
  }
  // ===================================================临时存储行数据================================================================

  // ========================================================操作方法===========================================================
  /**点击取消 编辑/新增 状态 (编辑：会还原编辑之前的数据，新增：会删除当前这一条数据)
   * @param rowKey 行主键值
  */
  onCancelRowOperation = (rowKey: PropertyKey) => {
    // 还原数据+移除操作状态+移除临时存储数据+删除错误信息
    const tempData = this.getTempState(rowKey)
    if (tempData) {
      this.state[rowKey] = copy({ ...tempData })
    }
    const operationState = this.operationState[rowKey]
    this.removeOperationState(rowKey)
    this.removeTempState(rowKey)
    this.deleteErrorInfo(rowKey)
    if (operationState === 'add') {
      const _list = [...this._last_dataList].filter((item) => item[this.rowKey] !== rowKey)
      /**触发删除行数据事件*/
      this.onChangeRows?.(_list, rowKey, 'delete')
    }
    return this
  }
  /**点击编辑操作
   * @param rowKey 行主键值
  */
  onClickEditRowOperation = (rowKey: PropertyKey) => {
    // 保存临时数据
    this.updatedTempState(rowKey, this.state[rowKey])
    /**更新操作状态为编辑*/
    this.updatedOperationState(rowKey, 'edit')
    return this
  }
  /**点击新增操作
   * @param initData 初始值
  */
  onClickAddRowOperation = (initData: Partial<T>) => {
    const { rowId } = this.addRowData(initData)
    const _list = [...this._last_dataList].concat([{ [this.rowKey]: rowId }])
    /**更新操作状态为新增*/
    this.updatedOperationState(rowId, 'add')
    /**触发新增行数据事件*/
    this.onChangeRows?.(_list, rowId, 'add')
    return this
  }
  /**点击保存操作
   * @param rowKey 行主键值
   * @param isThrowError 是否抛出错误(可选)
  */
  onClickSaveRowOperation = async (rowKey: PropertyKey, isThrowError: boolean = true) => {
    let isValidate = true
    try {
      // 验证是否通过
      const resultData = await this.validate(this.state[rowKey])
      if (resultData) {
        isValidate = true
        // 移除错误信息
        this.deleteErrorInfo(rowKey);
        /**移除临时存储数据*/
        this.removeTempState(rowKey)
        /**移除操作状态*/
        this.removeOperationState(rowKey)
      }
    } catch (error) {
      isValidate = false
      if (isThrowError) {
        throw error
      }
    }
    return Promise.resolve(isValidate)
  }
  /**
   * 点击删除
   * @param rowKey 行主键值
  */
  onClickDeleteRowOperation = (rowKey: PropertyKey) => {
    const _list = [...this._last_dataList].filter((item) => item[this.rowKey] !== rowKey)
    /**触发删除行数据事件*/
    this.onChangeRows?.(_list, rowKey, 'delete')
    // 删除行数据
    this.deleteRowData(rowKey)
    // 删除错误信息
    this.deleteErrorInfo(rowKey)
    /**移除操作状态*/
    this.removeOperationState(rowKey)
    /**移除临时存储数据*/
    this.removeTempState(rowKey)
    return this
  }
  // ===================================================操作方法================================================================

  // ===================================================规则处理================================================================
  /**列规则 */
  rules: Record<PropertyKey, ((rowData: T, instance: ChildInstance<T>) => RuleItem[] | Promise<RuleItem[]>) | RuleItem[]> = {}
  /**规则验证
   * @param rowData 行数据对象
   * @param fields 列字段数组(可选)
   * @param isReturn 是否返回验证结果(可选)
  */
  validate = async (rowData: T, fields?: PropertyKey[], isReturn: boolean = true): Promise<ValidateFieldsError | Values> => {
    let _fields = fields
    const rules: Record<PropertyKey, RuleItem[]> = {}
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
   * @param options.isHasOperationRow 是否判断存在正在操作的行，如果存在则抛出错误,在启用操作状态时使用(可选)
   * @param options.isReject 存在错误时是否使用 Promise.reject 抛出错误(可选)
   * @returns 验证结果
  */
  validateAll = async (options: { rowKeys?: PropertyKey[], fields?: PropertyKey[], isReject?: boolean, isHasOperationRow?: boolean }): Promise<ChildInstanceValidateAllResult<T>> => {
    const { rowKeys, fields, isReject = true, isHasOperationRow = false } = options
    // 如果存在正在操作的行，则抛出错误
    if (isHasOperationRow && this.enableOperationState) {
      const hasOperationRow = this.isExistOperationState()
      if (hasOperationRow) {
        return Promise.reject({
          errorInfo: {},
          dataList: [],
          isErrorInfo: false,
          isHasOperationRow: true
        })
      }
    }
    let _keys = rowKeys
    if (Array.isArray(rowKeys) && rowKeys.length) {
      _keys = rowKeys
    } else {
      _keys = Object.keys(this.state || {})
    }
    let isErrorInfo = false;
    const errorInfo: Record<PropertyKey, { errors: ValidateError[] | null, fields: ValidateFieldsError | Values, otherError?: any }> = {}
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
  /**
   * 把数组转换成 主键 => 数据 的对象
   * @param array 数组
   * @returns 转换后的对象
  */
  convertArrayToObject = <K extends T = T>(array: K[]) => {
    const object: Record<PropertyKey, T> = {}
    const list: Record<PropertyKey, PropertyKey>[] = []
    for (let index = 0; index < array.length; index++) {
      const item = array[index];
      const rowKey = item[this.rowKey]
      object[rowKey] = copy({ ...item })
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
export function useChildInstanceContextState<T extends MObject<T> = object>(options?: { sync?: boolean }) {
  const instance = useContext(ChildInstanceContext) as ChildInstance<T>
  const state = useSnapshot(instance.state, options)
  const errorState = useSnapshot(instance.errorState)
  const operationState = useSnapshot(instance.operationState)
  return [state, errorState, operationState, instance, state.__defaultValue, errorState.__defaultValue, operationState.__defaultValue] as unknown as [
    Record<string, T>,
    Record<string, Record<keyof T, string[]>>,
    Record<string, 'add' | 'edit'>,
    ChildInstance<T>,
    string | undefined,
    string | undefined,
    string | undefined
  ]
}

/**获取操作状态+实例*/
export function useChildInstanceContextOperationState<T extends MObject<T> = object>(options?: { sync?: boolean }) {
  const instance = useContext(ChildInstanceContext) as ChildInstance<T>
  const operationState = useSnapshot(instance.operationState, options)
  return [operationState, instance, operationState.__defaultValue] as unknown as [
    Record<string, 'add' | 'edit'>,
    ChildInstance<T>,
    string | undefined
  ]
}
