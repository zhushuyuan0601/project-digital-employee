import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'

// Element Plus
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

// 全局样式
import './styles/index.css'

const app = createApp(App)
const pinia = createPinia()

// 注册 Element Plus 图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(pinia)
app.use(router)
app.use(ElementPlus, {
  locale: {
    el: {
      colorpicker: {
        confirm: '确定',
        clear: '清空'
      },
      datepicker: {
        now: '此刻',
        today: '今天',
        cancel: '取消',
        clear: '清空',
        confirm: '确定',
        dateTablePrompt: '使用箭头键选择日期，按 Enter 键确认选择',
        monthTablePrompt: '使用箭头键选择月份，按 Enter 键确认选择',
        yearTablePrompt: '使用箭头键选择年份，按 Enter 键确认选择',
        selectedDate: '已选日期',
        selectDate: '选择日期',
        selectTime: '选择时间',
        startDate: '开始日期',
        startTime: '开始时间',
        endDate: '结束日期',
        endTime: '结束时间',
        prevYear: '前一年',
        nextYear: '后一年',
        prevMonth: '上个月',
        nextMonth: '下个月',
        year: '年',
        month1: '1 月',
        month2: '2 月',
        month3: '3 月',
        month4: '4 月',
        month5: '5 月',
        month6: '6 月',
        month7: '7 月',
        month8: '8 月',
        month9: '9 月',
        month10: '10 月',
        month11: '11 月',
        month12: '12 月',
        weeks: ['日', '一', '二', '三', '四', '五', '六'],
        weeksFull: ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'],
        months: ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
      },
      inputNumber: {
        decrease: '减少',
        increase: '增加'
      },
      select: {
        loading: '加载中',
        noMatch: '无匹配数据',
        noData: '无数据',
        placeholder: '请选择'
      },
      cascader: {
        noMatch: '无匹配数据',
        loading: '加载中',
        placeholder: '请选择',
        noData: '暂无数据'
      },
      pagination: {
        goto: '前往',
        pagesize: '条/页',
        total: '共 {total} 条',
        pageClassifier: '页',
        deprecation10: '待实现',
        deprecation11: '待实现'
      },
      messagebox: {
        title: '提示',
        confirm: '确定',
        cancel: '取消',
        error: '输入的数据不合法!'
      },
      upload: {
        deleteTip: '按 delete 键可删除',
        delete: '删除',
        preview: '查看图片',
        continue: '继续上传'
      },
      table: {
        emptyText: '暂无数据',
        confirmFilter: '筛选',
        resetFilter: '重置',
        clearFilter: '全部',
        sumText: '合计'
      },
      tour: {
        next: '下一步',
        previous: '上一步',
        finish: '结束导览'
      },
      tree: {
        emptyText: '暂无数据'
      },
      transfer: {
        noMatch: '无匹配数据',
        noData: '无数据',
        titles: ['列表 1', '列表 2'],
        filterPlaceholder: '输入关键词',
        noCheckedFormat: '共 {total} 项',
        hasCheckedFormat: '已选 {checked}/{total} 项'
      },
      image: {
        error: '加载失败'
      },
      pageHeader: {
        title: '返回'
      },
      popconfirm: {
        confirmButtonText: '确定',
        cancelButtonText: '取消'
      },
      carousel: {
        leftArrow: '上一张幻灯片',
        rightArrow: '下一张幻灯片',
        indicator: '幻灯片切换至索引 {index}'
      }
    }
  }
})

// 移除 loading
const loadingElement = document.getElementById('loading')
if (loadingElement) {
  loadingElement.remove()
}

app.mount('#app')
