//global vars
var inputConfig = input.config()

let casualWorkerWeeklyPayrollRecIds = inputConfig.casualWorkerWeeklyPayrollRecIds
let casualWorkerRecIds = inputConfig.casualWorkerRecIds

//fetch required tables
let casualWorkersTable = base.getTable("Casual Workers")
let weeklyWorkDetailsTable = base.getTable("Weekly Work Details")
let expenseRegisterTable = base.getTable("Expenses Register")

//constants
const idKey = 'id'
const nameKey = 'name'
const fieldsKey = 'fields'

//Expense Register Constants
const erCasualWorkerWeeklyPayrollField = 'Casual Workers Weekly Payroll Info'
const erTypeField = 'Type'
const erCasualWorkersTypeFieldValue = 'Casual Workers'
const erPayeeInfoField = "Payee Info"

//Casual Workers table constants
const cwPaymentInfoField = "Payment Info"

//Weekly Work Details Constants
const wwdWorkerField = "Worker"
const wwdPastWorkerField = "Past Worker"

//fetch casual workers info and construct worker-id to payment-info map
let casualWorkersPaymentInfoMap = new Map()

if(!checkIfArrayNullOrEmpty(casualWorkerRecIds)){
    let casualWorkerRecResultSetArr = []

    while(casualWorkerRecIds.length>0){
        let curWorkerRecResultSet = await casualWorkersTable.selectRecordsAsync(
            {
                fields:[cwPaymentInfoField],
                recordIds : casualWorkerRecIds.slice(0,100)
            }
        )
        casualWorkerRecResultSetArr = casualWorkerRecResultSetArr.concat(curWorkerRecResultSet.records)
        casualWorkerRecIds = casualWorkerRecIds.slice(100)
    }

    for(let curWorkerRec of casualWorkerRecResultSetArr){

        let curWorkerPaymentInfo = curWorkerRec.getCellValue(cwPaymentInfoField)

        if(!checkIfArrayNullOrEmpty(curWorkerPaymentInfo)){
            casualWorkersPaymentInfoMap.set(curWorkerRec.id,curWorkerPaymentInfo[0].id)
        }
    }
}

//construct expense register create records array
//shift current work week details to work history
if (!checkIfArrayNullOrEmpty(casualWorkerWeeklyPayrollRecIds)) {

    let weeklyWorkDetailsRecResultSetArr = []

    while(casualWorkerWeeklyPayrollRecIds.length>0){
        let curWeekDetailsRecResultSet = await weeklyWorkDetailsTable.selectRecordsAsync(
            {
                fields:[wwdWorkerField,wwdPastWorkerField],
                recordIds : casualWorkerWeeklyPayrollRecIds.slice(0,100)
            }
        )
        weeklyWorkDetailsRecResultSetArr = weeklyWorkDetailsRecResultSetArr.concat(curWeekDetailsRecResultSet.records)
        casualWorkerWeeklyPayrollRecIds = casualWorkerWeeklyPayrollRecIds.slice(100)
    }

    let expenseCreateRecArr = []
    let weeklyWorkDetailsUpdateArr = []
    for (let curWWDRec of weeklyWorkDetailsRecResultSetArr) {

        //Construct expense-register create array
        let expenseCreateRecObj = {}

        //Set casual worker info field
        expenseCreateRecObj[erCasualWorkerWeeklyPayrollField] = [createKeyValueObj(idKey, curWWDRec.id)]

        //set payee info field if payment-info for the worker exists
        let curWWDRecWorker = curWWDRec.getCellValue(wwdWorkerField)
        if(!checkIfArrayNullOrEmpty(curWWDRecWorker)){
            if(casualWorkersPaymentInfoMap.has(curWWDRecWorker[0].id)){
                expenseCreateRecObj[erPayeeInfoField] = [createKeyValueObj(idKey,casualWorkersPaymentInfoMap.get(curWWDRecWorker[0].id))]
            }
        }

        //set expense-type field
        expenseCreateRecObj[erTypeField] = createKeyValueObj(nameKey, erCasualWorkersTypeFieldValue)

        expenseCreateRecArr.push(
            createKeyValueObj(
                fieldsKey,
                expenseCreateRecObj
            )
        )

        //Construct update object for weekly-work-details table
        let wwdUpdateObj = {}
        wwdUpdateObj[wwdWorkerField] = []
        if(!checkIfArrayNullOrEmpty(curWWDRecWorker)){
            wwdUpdateObj[wwdPastWorkerField] = [createKeyValueObj(idKey,curWWDRecWorker[0].id)]
        }

        let finalWwdUpdateObj = {}
        finalWwdUpdateObj[idKey] = curWWDRec.id
        finalWwdUpdateObj[fieldsKey] = wwdUpdateObj
        weeklyWorkDetailsUpdateArr.push(finalWwdUpdateObj)

    }

    let finalExpenseCreateArr = convertAnyToConst(expenseCreateRecArr)
    let finalWeeklyWorkDetailsUpdateArr = convertAnyToConst(weeklyWorkDetailsUpdateArr)

    //create Expense Register table records
    while (finalExpenseCreateArr.length > 0) {
        await expenseRegisterTable.createRecordsAsync(
            finalExpenseCreateArr.slice(0, 50)
        )
        finalExpenseCreateArr = finalExpenseCreateArr.slice(50)
    }

    //update weekly work details table records
    while (finalWeeklyWorkDetailsUpdateArr.length > 0) {
        await weeklyWorkDetailsTable.updateRecordsAsync(
            finalWeeklyWorkDetailsUpdateArr.slice(0, 50)
        )
    finalWeeklyWorkDetailsUpdateArr = finalWeeklyWorkDetailsUpdateArr.slice(50)
    }
}


function createKeyValueObj(key, value) {
    let obj = {}
    obj[key] = value
    return obj
}

function convertAnyToConst(anyVariable) {
    const constVariable = anyVariable
    return constVariable
}

function checkIfArrayNullOrEmpty(arr) {
    return arr == null || arr == undefined || (arr != null && arr != undefined && !(arr.length > 0))
}