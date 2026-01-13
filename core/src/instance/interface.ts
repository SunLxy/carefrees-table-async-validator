import { ValidateError } from "async-validator"
import { ValidateFieldsError } from "async-validator"
import { Values } from "async-validator"

export type MObject<T> = { [K in keyof T]: T[K] }

/**子实例验证返回 */
export interface ChildInstanceValidateAllResult<T extends MObject<T> = object> {
  /**错误信息*/
  errorInfo: Record<string, { errors: ValidateError[] | null, fields: ValidateFieldsError | Values, otherError?: any }>
  /**成功数据列表*/
  dataList: T[]
  /**是否有错误*/
  isErrorInfo: boolean
}

/**映射类型，将每个子项的验证结果映射到父项验证结果中*/
export type ProviderInstanceValidateResultMappedType<T extends MObject<T>> = {
  [K in keyof T]: ({ name: K } & ChildInstanceValidateAllResult<T[K]>)[]
}[keyof T]

/**父项实例验证结果*/
export interface ProviderInstanceValidateResult<T extends MObject<T>> {
  /** 没找到实例*/
  nameToNotFound: { name: keyof T, message: string }[]
  /**有错误实例*/
  nameToErrorInfo: ProviderInstanceValidateResultMappedType<T>
  /**没有错误实例*/
  nameToSuccessInfo: ProviderInstanceValidateResultMappedType<T>
}