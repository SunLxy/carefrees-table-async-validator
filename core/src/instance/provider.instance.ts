/**
 * 父级
*/
import { createContext, useContext, useEffect, useRef } from "react"
import { proxy, ref, useSnapshot, } from "valtio"
import type { ProviderInstanceValidateResult, MObject } from "./interface"
import { ChildInstance, useChildInstance } from "./child.instance"


/**父项实例*/
export class ProviderInstance<T extends MObject<T> = object> {
  /*** 子实例 */
  childInstanceState = proxy({} as {
    [K in keyof T]: ChildInstance<T[K]>;
  })
  // ===================================================子实例处理================================================================
  /**
   * 注册子实例
  */
  register = <M extends keyof T>(name: M, childInstance: ChildInstance<T[M]>) => {
    this.childInstanceState[name] = ref(childInstance)
  }
  /**
   * 注销子实例
  */
  unregister = (name: keyof T) => {
    delete this.childInstanceState[name]
  }
  // ===================================================子实例处理================================================================

  /**调用子项验证
   * @param options.names 子实例名称(可选)
   * @param options.rowKey 行主键值数组(可选)
   * @param options.fields 列字段数组(可选)
   * @param options.isReject 是否使用 Promise.reject 抛出错误(可选)
   * @returns 验证结果
  */
  validate = async (options: { names?: (keyof T)[], rowKey?: string[], fields?: string[], isReject?: boolean } = {}): Promise<ProviderInstanceValidateResult<T>> => {
    const { names, rowKey, fields, isReject = true } = options
    // rowKey 如果不为空，则验证指定多行数据，如果没有，则验证所有
    // fields 如果不为空，则验证指定列数据，如果没有，则验证所有
    /**没找到实例*/
    const nameToNotFound: ProviderInstanceValidateResult<T>['nameToNotFound'] = []
    /**有错误实例*/
    const nameToErrorInfo: ProviderInstanceValidateResult<T>['nameToErrorInfo'] = []
    /**没有错误实例*/
    const nameToSuccessInfo: ProviderInstanceValidateResult<T>['nameToSuccessInfo'] = []
    let _newNames = names
    if (!names || (Array.isArray(names) && names.length === 0)) {
      _newNames = Object.keys(this.childInstanceState) as (keyof T)[]
    }
    for (let index = 0; index < _newNames.length; index++) {
      const _name = _newNames[index];
      // 验证子实例
      const childInstance = this.childInstanceState[_name]
      if (!childInstance) {
        nameToNotFound.push({ name: _name, message: `name: ${_name.toString()} 未查到实例，请确认是否注册` })
      } else {
        const validateResult = await childInstance.validateAll({ rowKeys: rowKey, fields, isReject: false })
        if (validateResult.isErrorInfo) {
          nameToErrorInfo.push({ ...validateResult, name: _name })
        } else {
          nameToSuccessInfo.push({ ...validateResult, name: _name })
        }
      }
    }
    if (isReject && nameToErrorInfo.length) {
      return Promise.reject({ nameToNotFound, nameToErrorInfo, nameToSuccessInfo })
    }
    return Promise.resolve({ nameToNotFound, nameToErrorInfo, nameToSuccessInfo })
  }
}
/**初始化实例*/
export function useProviderInstance<T extends MObject<T> = object>(instance?: ProviderInstance<T>) {
  const ref = useRef<ProviderInstance<T>>()
  if (!ref.current) {
    if (instance) {
      ref.current = instance
    } else {
      ref.current = new ProviderInstance<T>()
    }
  }
  return ref.current
}

/**context*/
export const ProviderInstanceContext = createContext<ProviderInstance<any>>(new ProviderInstance<any>())

/**获取状态+实例*/
export function useProviderInstanceContextState<T extends MObject<T> = object>() {
  const providerInstance = useContext<ProviderInstance<T>>(ProviderInstanceContext)
  const state = useSnapshot(providerInstance.childInstanceState)
  return [state, providerInstance] as unknown as [{
    [K in keyof T]: ChildInstance<T[K]>;
  }, ProviderInstance<T>]
}

/**仅获取实例*/
export function useProviderInstanceContext<T extends MObject<T> = object>() {
  return useContext<ProviderInstance<T>>(ProviderInstanceContext)
}

/**注册子实例*/
export function useRegisterChildInstance<T extends MObject<T> = object, M extends keyof T = keyof T>(name: M) {
  const providerInstance = useProviderInstanceContext<T>()
  const childInstance = useChildInstance<T[M]>()
  childInstance.namespace = name
  useEffect(() => {
    providerInstance.register(name, childInstance)
    return () => providerInstance.unregister(name)
  }, [name, childInstance, providerInstance])
  return { childInstance, providerInstance }
}