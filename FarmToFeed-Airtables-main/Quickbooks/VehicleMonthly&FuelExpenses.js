//input config
var inputConfig = input.config()

//collect transporters record ids from mileage-tracking and fuel expenses table both
let mtTransporterRecIds = !checkIfArrayNullOrEmpty(inputConfig.mtTransporterRecIds) ? inputConfig.mtTransporterRecIds : []
let fuelExpensesTransporterRecIds = !checkIfArrayNullOrEmpty(inputConfig.fuelExpensesTransporterRecIds) ? inputConfig.fuelExpensesTransporterRecIds : []

let transporterRecIds = mtTransporterRecIds.concat(fuelExpensesTransporterRecIds)

let mileageTrackingRecIds = inputConfig.mileageTrackingRecIds
let fuelExpensesRecIds = inputConfig.fuelExpensesRecIds
let cronTriggerDate = new Date(inputConfig.cronTriggerDate)

let endDate = new Date(cronTriggerDate.getFullYear(), cronTriggerDate.getMonth(), cronTriggerDate.getDate())
let startDate = new Date(cronTriggerDate.getFullYear(), cronTriggerDate.getMonth(), (cronTriggerDate.getDate() > 15 ? 16 : 1))

//Constants
const idKey = "id"
const nameKey = "name"
const fieldsKey = "fields"

//Mileage Tracking table constants
const mtDateField = "Date"
const mtTransporterField = "Transporter"
const mtFirstMileField = "First Mile"
const mtLastMileField = "Last Mile"
const mtTransportationTypeField = "Transportation Type"
const mtDistanceCoveredKmsField = "Distance Covered (kms)"

//Expense Register table constants
const erDateField = "Date"
const erMileageTrackingInfoField = "Mileage Tracking Info"
const erMonthlyLeaseAmt = "Monthly Lease Amount"
const erTotalMileage = "Total Mileage (kms)"
const erFuelExpensesTaggedField = "Fuel Expenses Tagged"
const erTypeField = "Type"
const erPayeeInfoField = "Payee Info"
const erFirstMileTypeFieldValue = "Monthly Transporter - First Mile Expense"
const erLastMileTypeFieldValue = "Monthly Transporter - Last Mile Expense"

//Transporter table constants
const transporterPaymentInfoField = "Payment Info"
const transporterTypeField = "Type"
const transportersDriverVehicleOwnerPaymentInfoField = "Vehicle Owner Payment Info"
const transportersDriverVehicleOwnerType = "Vehicle Owner Type"
const transporterVehicleMonthlyLeaseCost = "Final Vehicle Monthly Lease Cost"
const transporterDriverTypeFieldValue = "Driver"
const transporterTruckOwnerTypeFieldValue = "Truck Owner"
const transporterLeasingOrgTypeFieldValue = "Leasing Organization"

//Transporter Fuel Expenses table constants
const fuelExpenseDateField = "Date"
const fuelExpenseTransporterField = "Transporter"

//fetch required table(s)
let transporterTable = base.getTable("Transporters")
let mileageTrackingTable = base.getTable("Mileage Tracking")
let fuelExpensesTable = base.getTable("Transport Fuel Expenses")
let expenseRegisterTable = base.getTable("Expenses Register")

//fetch transporter records and construct transporter to payment info map
let transporterToPaymentInfoMap = new Map()
let transporterToVehicleMonthlyLeaseCostMap = new Map()
if (!checkIfArrayNullOrEmpty(transporterRecIds)) {

    //Transporter table records
    let transporterRecordsResultSet = []
    while (transporterRecIds.length > 0) {
        let transporterRecordsObj = await transporterTable.selectRecordsAsync({
            fields: [transportersDriverVehicleOwnerType, transportersDriverVehicleOwnerPaymentInfoField, transporterPaymentInfoField, transporterTypeField, transporterVehicleMonthlyLeaseCost],
            recordIds: transporterRecIds.slice(0, 100)
        })
        transporterRecordsResultSet = transporterRecordsResultSet.concat(transporterRecordsObj.records)
        transporterRecIds = transporterRecIds.slice(100)
    }

    //fetch payment info of vehicle owners
    for (let curTransporterRec of transporterRecordsResultSet) {

        let curTransporterType = curTransporterRec.getCellValueAsString(transporterTypeField)
        let curDriverVehicleOwnerType = curTransporterRec.getCellValueAsString(transportersDriverVehicleOwnerType)

        //set payment info
        if (curTransporterType == transporterDriverTypeFieldValue && curDriverVehicleOwnerType != transporterTruckOwnerTypeFieldValue) {

            let curDriverVehicleOwnerPaymentInfo = curTransporterRec.getCellValue(transportersDriverVehicleOwnerPaymentInfoField)

            //Dev NOTE: look-up of linked field is arr of str
            transporterToPaymentInfoMap.set(
                curTransporterRec.id,
                !checkIfArrayNullOrEmpty(curDriverVehicleOwnerPaymentInfo) ?
                curDriverVehicleOwnerPaymentInfo[0] :
                null
            )
        }

        if (curTransporterType == transporterLeasingOrgTypeFieldValue) {

            let curLeaseOrgPaymentInfo = curTransporterRec.getCellValue(transporterPaymentInfoField)

            transporterToPaymentInfoMap.set(
                curTransporterRec.id,
                !checkIfArrayNullOrEmpty(curLeaseOrgPaymentInfo) ?
                curLeaseOrgPaymentInfo[0].id :
                null
            )
        }

        //set monthly lease cost
        let monthlyLeaseCost = curTransporterRec.getCellValue(transporterVehicleMonthlyLeaseCost)

        transporterToVehicleMonthlyLeaseCostMap.set(
            curTransporterRec.id,
            !isNullOrEmptyUtil(monthlyLeaseCost) ?
            parseFloat(monthlyLeaseCost.toString()) :
            0.0
        )

    }
}

//fetch mileage-tracking records
let mileageTrackingRecordsArr = []

while (mileageTrackingRecIds.length > 0) {
    let curMileageTrackingRecords = await mileageTrackingTable.selectRecordsAsync({
        fields: [mtDateField, mtTransporterField, mtFirstMileField, mtLastMileField, mtTransportationTypeField, mtDistanceCoveredKmsField],
        recordIds: mileageTrackingRecIds.slice(0, 100)
    })

    mileageTrackingRecordsArr = mileageTrackingRecordsArr.concat(curMileageTrackingRecords.records)

    mileageTrackingRecIds = mileageTrackingRecIds.slice(100)
}

//fetch fuel-expenses records
let fuelExpensesRecordsArr = []

while (fuelExpensesRecIds.length > 0) {
    let curFuelExpensesRecords = await fuelExpensesTable.selectRecordsAsync({
        fields: [fuelExpenseDateField, fuelExpenseTransporterField],
        recordIds: fuelExpensesRecIds.slice(0, 100)
    })

    fuelExpensesRecordsArr = fuelExpensesRecordsArr.concat(curFuelExpensesRecords.records)

    fuelExpensesRecIds = fuelExpensesRecIds.slice(100)
}

//construct expense-register create obj map grouped by each transporter for first and last mile seperately
let expenseRegisterFirstMileCreateMap = {}
let expenseRegisterLastMileCreateMap = {}

let transporterTotalMileageMap = new Map()

//construct expense-register create array for mileage-tracking-info for leasing orgs
for (let curMtRec of mileageTrackingRecordsArr) {

    let curMtDateFieldValue = new Date(curMtRec.getCellValue(mtDateField))

    //ensure that mileage-tracking-rec comes in date range of (month-start/month-mid) and trigger date 
    if (checkIfDateComesBeforeOrAfter(curMtDateFieldValue, startDate, false) && checkIfDateComesBeforeOrAfter(curMtDateFieldValue, endDate, true)) {

        let curMtRecTransporterFieldValue = curMtRec.getCellValue(mtTransporterField)

        if (!checkIfArrayNullOrEmpty(curMtRecTransporterFieldValue)) {

            let curMtRecFirstMileFieldValue = curMtRec.getCellValue(mtFirstMileField)
            let curMtRecLastMileFieldValue = curMtRec.getCellValue(mtLastMileField)
            let curMtRecTransporterFieldValueLinkedRecId = curMtRecTransporterFieldValue[0].id
            let curMtRecTransportationTypeFieldValue = curMtRec.getCellValueAsString(mtTransportationTypeField)

            if (transporterToPaymentInfoMap.has(curMtRecTransporterFieldValueLinkedRecId)) {
                if (!checkIfArrayNullOrEmpty(curMtRecFirstMileFieldValue) || containsIgnoreCase(curMtRecTransportationTypeFieldValue, mtFirstMileField)) {

                    expenseRegisterFirstMileCreateMap = updateExpenseRegisterCreateMap(
                        expenseRegisterFirstMileCreateMap,
                        curMtRecTransporterFieldValueLinkedRecId,
                        curMtRec.id,
                        erFirstMileTypeFieldValue,
                        transporterToPaymentInfoMap
                    )
                }

                if (!checkIfArrayNullOrEmpty(curMtRecLastMileFieldValue) || containsIgnoreCase(curMtRecTransportationTypeFieldValue, mtLastMileField)) {

                    expenseRegisterLastMileCreateMap = updateExpenseRegisterCreateMap(
                        expenseRegisterLastMileCreateMap,
                        curMtRecTransporterFieldValueLinkedRecId,
                        curMtRec.id,
                        erLastMileTypeFieldValue,
                        transporterToPaymentInfoMap
                    )
                }

                let curMtRecDistanceCoveredKmsFieldValue = curMtRec.getCellValueAsString(mtDistanceCoveredKmsField)
                if (!isNullOrEmptyUtil(curMtRecDistanceCoveredKmsFieldValue)) {

                    transporterTotalMileageMap.set(
                        curMtRecTransporterFieldValueLinkedRecId,
                        transporterTotalMileageMap.has(curMtRecTransporterFieldValueLinkedRecId) ?
                        transporterTotalMileageMap.get(curMtRecTransporterFieldValueLinkedRecId) + parseFloat(curMtRecDistanceCoveredKmsFieldValue) :
                        parseFloat(curMtRecDistanceCoveredKmsFieldValue)
                    )

                    //count transporter-wise total mileage driven
                    expenseRegisterFirstMileCreateMap = updateExpenseRegisterCreateMap3(
                        expenseRegisterFirstMileCreateMap,
                        curMtRecTransporterFieldValueLinkedRecId,
                        transporterTotalMileageMap.get(curMtRecTransporterFieldValueLinkedRecId),
                        transporterToVehicleMonthlyLeaseCostMap.has(curMtRecTransporterFieldValueLinkedRecId) ?
                        transporterToVehicleMonthlyLeaseCostMap.get(curMtRecTransporterFieldValueLinkedRecId) :
                        0.0
                    )
                    expenseRegisterLastMileCreateMap = updateExpenseRegisterCreateMap3(
                        expenseRegisterLastMileCreateMap,
                        curMtRecTransporterFieldValueLinkedRecId,
                        transporterTotalMileageMap.get(curMtRecTransporterFieldValueLinkedRecId),
                        transporterToVehicleMonthlyLeaseCostMap.has(curMtRecTransporterFieldValueLinkedRecId) ?
                        transporterToVehicleMonthlyLeaseCostMap.get(curMtRecTransporterFieldValueLinkedRecId) :
                        0.0
                    )

                }

            }
        }
    }
}

//construct expense-register create array for fuel expenses of leasing org.
for (let curFuelExpenseRec of fuelExpensesRecordsArr) {

    let curFuelExpenseDateFieldValue = new Date(curFuelExpenseRec.getCellValue(fuelExpenseDateField))

    //ensure that fuel-expense-rec comes in date range of (month-start/month-mid) and trigger date 
    if (checkIfDateComesBeforeOrAfter(curFuelExpenseDateFieldValue, startDate, false) && checkIfDateComesBeforeOrAfter(curFuelExpenseDateFieldValue, endDate, true)) {

        let curFERecTransporterFieldValue = curFuelExpenseRec.getCellValue(fuelExpenseTransporterField)

        if (!checkIfArrayNullOrEmpty(curFERecTransporterFieldValue)) {

            expenseRegisterFirstMileCreateMap = updateExpenseRegisterCreateMap2(
                expenseRegisterFirstMileCreateMap,
                curFERecTransporterFieldValue[0].id,
                curFuelExpenseRec.id
            )

            expenseRegisterLastMileCreateMap = updateExpenseRegisterCreateMap2(
                expenseRegisterLastMileCreateMap,
                curFERecTransporterFieldValue[0].id,
                curFuelExpenseRec.id
            )

        }
    }
}

//extract expense-register table create arrays
let expenseRegisterFinalCreateArr = Object.values(expenseRegisterFirstMileCreateMap).concat(Object.values(expenseRegisterLastMileCreateMap))
//create records in expense-register
while (expenseRegisterFinalCreateArr.length > 0) {
    await expenseRegisterTable.createRecordsAsync(expenseRegisterFinalCreateArr.slice(0, 50))
    expenseRegisterFinalCreateArr = expenseRegisterFinalCreateArr.slice(50)
}

function checkIfDateComesBeforeOrAfter(dateToBeChecked, dateToBeCheckedAgainst, checkBeforeFlag) {
    dateToBeChecked.setHours(0, 0, 0, 0)
    dateToBeCheckedAgainst.setHours(0, 0, 0, 0)
    return (checkBeforeFlag ? dateToBeChecked <= dateToBeCheckedAgainst : dateToBeChecked >= dateToBeCheckedAgainst)
}

function checkIfArrayNullOrEmpty(arr) {
    return arr == null || arr == undefined || (arr != null && arr != undefined && !(arr.length > 0))
}

function updateExpenseRegisterCreateMap3(expenseRegisterCreateMap, transporterRecId, mtDistanceCoveredKmsVal, transporterMonthlyLeaseCost) {
    if (expenseRegisterCreateMap.hasOwnProperty(transporterRecId)) {

        //update totalMileage
        if (!isNullOrEmptyUtil(mtDistanceCoveredKmsVal)) {
            let erCreateObj = expenseRegisterCreateMap[transporterRecId][fieldsKey]
            if (erCreateObj.hasOwnProperty(erTotalMileage)) {
                let erTotalMileageCurVal = mtDistanceCoveredKmsVal
                expenseRegisterCreateMap[transporterRecId][fieldsKey][erTotalMileage] = erTotalMileageCurVal
            } else {
                erCreateObj[erTotalMileage] = mtDistanceCoveredKmsVal
                expenseRegisterCreateMap[transporterRecId][fieldsKey] = erCreateObj
            }
        }

        //update monthly lease cost
        if (!isNullOrEmptyUtil(transporterMonthlyLeaseCost)) {
            let erCreateObj = expenseRegisterCreateMap[transporterRecId][fieldsKey]
            if (!erCreateObj.hasOwnProperty(erMonthlyLeaseAmt)) {
                erCreateObj[erMonthlyLeaseAmt] = transporterMonthlyLeaseCost
                expenseRegisterCreateMap[transporterRecId][fieldsKey] = erCreateObj
            }
        }
        return expenseRegisterCreateMap
    }
}

function updateExpenseRegisterCreateMap(expenseRegisterCreateMap, transporterRecId, mtRecId, erTypeFieldValue, transporterPaymentInfoMap) {

    if (!isNullOrEmptyUtil(expenseRegisterCreateMap) && expenseRegisterCreateMap.hasOwnProperty(transporterRecId)) {

        //update mileage tracking field
        if (!isNullOrEmptyUtil(mtRecId)) {
            let erMileageTrackingInfoFieldValue = expenseRegisterCreateMap[transporterRecId][fieldsKey][erMileageTrackingInfoField]
            erMileageTrackingInfoFieldValue.push(
                getKeyValueObj(idKey, mtRecId)
            )
            expenseRegisterCreateMap[transporterRecId][fieldsKey][erMileageTrackingInfoField] = erMileageTrackingInfoFieldValue
        }

    } else {

        if(isNullOrEmptyUtil(expenseRegisterCreateMap)){
            expenseRegisterCreateMap = {}
        }

        let expenseRegisterCreateObj = {}
        expenseRegisterCreateObj[fieldsKey] = {}
        expenseRegisterCreateObj[fieldsKey][erTypeField] = getKeyValueObj(nameKey, erTypeFieldValue)

        //set mileage-tracking-info field
        expenseRegisterCreateObj[fieldsKey][erMileageTrackingInfoField] = !isNullOrEmptyUtil(mtRecId) ? [getKeyValueObj(idKey, mtRecId)] : []

        if (transporterPaymentInfoMap.has(transporterRecId) && transporterPaymentInfoMap.get(transporterRecId) != null) {
            expenseRegisterCreateObj[fieldsKey][erPayeeInfoField] = [getKeyValueObj(idKey, transporterPaymentInfoMap.get(transporterRecId))]
        }
        expenseRegisterCreateObj[fieldsKey][erDateField] = new Date()
        expenseRegisterCreateMap[transporterRecId] = expenseRegisterCreateObj
    }

    return expenseRegisterCreateMap
}

function updateExpenseRegisterCreateMap2(expenseRegisterCreateMap, transporterRecId, fuelExpenseRecId) {

    if (expenseRegisterCreateMap.hasOwnProperty(transporterRecId)) {

        //update mileage tracking field
        if (!isNullOrEmptyUtil(fuelExpenseRecId)) {
            let erCreateObj = expenseRegisterCreateMap[transporterRecId][fieldsKey]
            if (erCreateObj.hasOwnProperty(erFuelExpensesTaggedField)) {
                let erFuelExpenseTaggedValue = erCreateObj[erFuelExpensesTaggedField]
                if (!checkIfArrayNullOrEmpty(erFuelExpenseTaggedValue)) {
                    erFuelExpenseTaggedValue.push(getKeyValueObj(idKey, fuelExpenseRecId))
                }
                expenseRegisterCreateMap[transporterRecId][fieldsKey][erFuelExpensesTaggedField] = erFuelExpenseTaggedValue
            } else {
                erCreateObj[erFuelExpensesTaggedField] = [getKeyValueObj(idKey, fuelExpenseRecId)]
                expenseRegisterCreateMap[transporterRecId][fieldsKey] = erCreateObj
            }
        }

    }

    return expenseRegisterCreateMap
}

function updateTotalMileageDrivenForERCreateArr(erCreateArr, transporterTotalMileageDrivenMap) {
    for (let curErCreateObj of erCreateArr) {

    }
}

function getKeyValueObj(key, value) {
    let obj = {}
    obj[key] = value
    return obj
}

function containsIgnoreCase(str1, str2) {
    return str1.toLowerCase().includes(str2.toLowerCase())
}

//check if null,empty,undefined,0,NaN,empty string,false
function isNullOrEmptyUtil(nullCheckValue) {
    if (nullCheckValue) {
        if (typeof nullCheckValue === 'string') {
            if (nullCheckValue.trim()) {
                return false
            } else {
                return true
            }
        } else {
            return false
        }
    } else {
        return true
    }
}