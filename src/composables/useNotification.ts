import { ElMessage, ElMessageBox } from 'element-plus'

export function useNotification() {
  const success = (message: string) => ElMessage.success(message)
  const error = (message: string) => ElMessage.error(message)
  const warning = (message: string) => ElMessage.warning(message)
  const info = (message: string) => ElMessage.info(message)

  const confirm = async (message: string, title = '确认') => {
    try {
      await ElMessageBox.confirm(message, title, {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      })
      return true
    } catch {
      return false
    }
  }

  return {
    success,
    error,
    warning,
    info,
    confirm,
  }
}
