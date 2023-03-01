//input config
var inputConfig = input.config()

//constants
const monthYearKey = "Month&Year"

let triggerDate = new Date(inputConfig.cronTriggerDate)

let monthAndYearStr = triggerDate.getFullYear()+"-"+(triggerDate.getMonth()+1)

output.set(monthYearKey,monthAndYearStr)