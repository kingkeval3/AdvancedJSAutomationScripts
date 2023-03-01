//input config
var inputConfig = input.config()

let dailyMileageTrackingRecIds = inputConfig.dailyMileageTrackingRecIds
let transporterRecIds = inputConfig.transporterRecIds

//Constants
const idKey = "id"
const nameKey = "name"
const fieldsKey = "fields"

//Mileage Tracking table constants
const mtTransporterField = "Transporter"
const mtFirstMileField = "First Mile"
const mtLastMileField = "Last Mile"
const mtTransportationTypeField = "Transportation Type"

//Expense Register table constants
const erMileageTrackingInfoField = "Mileage Tracking Info"
const erTypeField = "Type"
const erPayeeInfoField = "Payee Info"
const erFirstMileTypeFieldValue = "Daily Transporter - First Mile Expense"
const erLastMileTypeFieldValue = "Daily Transporter - Last Mile Expense"

//Transporter table constants
const transporterPaymentInfoField = "Payment Info"
const transporterTypeField = "Type"
const transportersDriverVehicleOwnerPaymentInfoField = "Vehicle Owner Payment Info"
const transportersDriverVehicleOwnerType = "Vehicle Owner Type"
const transporterDriverTypeFieldValue = "Driver"
const transporterTruckOwnerTypeFieldValue = "Truck Owner"
const transporterLeasingOrgTypeFieldValue = "Leasing Organization"

if (!checkIfArrayNullOrEmpty(dailyMileageTrackingRecIds)) {

    //fetch required table(s)
    let mileageTrackingTable = base.getTable("Mileage Tracking")
    let expenseRegisterTable = base.getTable("Expenses Register")
    let transporterTable = base.getTable("Transporters")

    //fetch payment info for each transporter vehicle owner
    let transporterToPaymentInfoMap = new Map()
    if (!checkIfArrayNullOrEmpty(transporterRecIds)) {

        //Transporter table records
        let transporterRecordsResultSet = []

        while (transporterRecIds.length > 0) {
            let transporterRecordsObj = await transporterTable.selectRecordsAsync({
                fields: [transportersDriverVehicleOwnerPaymentInfoField, transporterPaymentInfoField, transporterTypeField],
                recordIds: transporterRecIds.slice(0, 100)
            })
            transporterRecordsResultSet = transporterRecordsResultSet.concat(transporterRecordsObj.records)
            transporterRecIds = transporterRecIds.slice(100)
        }


        //fetch payment info of vehicle owners
        for (let curTransporterRec of transporterRecordsResultSet) {

            let curTransporterType = curTransporterRec.getCellValueAsString(transporterTypeField)
            let curDriverVehicleOwnerType = curTransporterRec.getCellValueAsString(transportersDriverVehicleOwnerType)
            
            if (curTransporterType == transporterDriverTypeFieldValue && curDriverVehicleOwnerType!=transporterLeasingOrgTypeFieldValue) {
                let curDriverVehicleOwnerPaymentInfo = curTransporterRec.getCellValue(transportersDriverVehicleOwnerPaymentInfoField)

                //Dev NOTE: look-up of linked field is arr of str
                transporterToPaymentInfoMap.set(
                    curTransporterRec.id,
                    !checkIfArrayNullOrEmpty(curDriverVehicleOwnerPaymentInfo) ?
                    curDriverVehicleOwnerPaymentInfo[0] :
                    null
                )
            }

            if (curTransporterType == transporterTruckOwnerTypeFieldValue) {

                let curTruckOwnerPaymentInfo = curTransporterRec.getCellValue(transporterPaymentInfoField)

                transporterToPaymentInfoMap.set(
                    curTransporterRec.id,
                    !checkIfArrayNullOrEmpty(curTruckOwnerPaymentInfo) ?
                    curTruckOwnerPaymentInfo[0].id :
                    null
                )
            }

        }
    }

    //fetch Mileage Tracking records
    let mileageTrackingRecordsResultSet = []

    while (dailyMileageTrackingRecIds.length > 0) {
        let mileageTrackingRecordsObj = await mileageTrackingTable.selectRecordsAsync({
            fields: [mtTransporterField,mtTransportationTypeField,mtFirstMileField,mtLastMileField],
            recordIds: dailyMileageTrackingRecIds.slice(0, 100)
        })

        mileageTrackingRecordsResultSet = mileageTrackingRecordsResultSet.concat(mileageTrackingRecordsObj.records)

        dailyMileageTrackingRecIds = dailyMileageTrackingRecIds.slice(100)
    }


    //construct expense-register create obj map grouped by each transporter for first and last mile seperately
    let expenseRegisterFirstMileCreateMap = {}
    let expenseRegisterLastMileCreateMap = {}

    for (let curMtRec of mileageTrackingRecordsResultSet) {

        let curMtRecTransporterFieldValue = curMtRec.getCellValue(mtTransporterField)

        if (!checkIfArrayNullOrEmpty(curMtRecTransporterFieldValue)) {

            let curMtRecFirstMileFieldValue = curMtRec.getCellValue(mtFirstMileField)
            let curMtRecLastMileFieldValue = curMtRec.getCellValue(mtLastMileField)
            let curMtRecTransporterFieldValueLinkedRecId = curMtRecTransporterFieldValue[0].id
            let curMtRecTransportationTypeFieldValue = curMtRec.getCellValueAsString(mtTransportationTypeField)

            if (transporterToPaymentInfoMap.has(curMtRecTransporterFieldValueLinkedRecId)) {
                if (!checkIfArrayNullOrEmpty(curMtRecFirstMileFieldValue) || containsIgnoreCase(curMtRecTransportationTypeFieldValue,mtFirstMileField)) {

                    expenseRegisterFirstMileCreateMap = updateExpenseRegisterCreateMap(
                        expenseRegisterFirstMileCreateMap,
                        curMtRecTransporterFieldValueLinkedRecId,
                        curMtRec.id,
                        erFirstMileTypeFieldValue,
                        transporterToPaymentInfoMap
                    )
                }

                if (!checkIfArrayNullOrEmpty(curMtRecLastMileFieldValue) || containsIgnoreCase(curMtRecTransportationTypeFieldValue,mtLastMileField)) {

                    expenseRegisterLastMileCreateMap = updateExpenseRegisterCreateMap(
                        expenseRegisterLastMileCreateMap,
                        curMtRecTransporterFieldValueLinkedRecId,
                        curMtRec.id,
                        erLastMileTypeFieldValue,
                        transporterToPaymentInfoMap
                    )
                }

            }
        }
    }

    //extract expense-register table create arrays
    let expenseRegisterFinalCreateArr = Object.values(expenseRegisterFirstMileCreateMap).concat(Object.values(expenseRegisterLastMileCreateMap))
    while (expenseRegisterFinalCreateArr.length > 0) {
        await expenseRegisterTable.createRecordsAsync(expenseRegisterFinalCreateArr.slice(0, 50))
        expenseRegisterFinalCreateArr = expenseRegisterFinalCreateArr.slice(50)
    }

}

function updateExpenseRegisterCreateMap(expenseRegisterCreateMap, transporterRecId, mtRecId, erTypeFieldValue,transporterPaymentInfoMap) {

    if (expenseRegisterCreateMap.hasOwnProperty(transporterRecId)) {

        let erMileageTrackingInfoFieldValue = expenseRegisterCreateMap[transporterRecId][fieldsKey][erMileageTrackingInfoField]
        erMileageTrackingInfoFieldValue.push(
            getKeyValueObj(idKey, mtRecId)
        )
        expenseRegisterCreateMap[transporterRecId][fieldsKey][erMileageTrackingInfoField] = erMileageTrackingInfoFieldValue

    } else {

        let expenseRegisterCreateObj = {}
        expenseRegisterCreateObj[fieldsKey] = {}
        expenseRegisterCreateObj[fieldsKey][erTypeField] = getKeyValueObj(nameKey, erTypeFieldValue)
        expenseRegisterCreateObj[fieldsKey][erMileageTrackingInfoField] = [getKeyValueObj(idKey, mtRecId)]
        
        if(transporterPaymentInfoMap.has(transporterRecId) && transporterPaymentInfoMap.get(transporterRecId)!=null){
            expenseRegisterCreateObj[fieldsKey][erPayeeInfoField] = [getKeyValueObj(idKey,transporterPaymentInfoMap.get(transporterRecId))]
        }

        expenseRegisterCreateMap[transporterRecId] = expenseRegisterCreateObj
    }

    return expenseRegisterCreateMap
}

function getKeyValueObj(key, value) {
    let obj = {}
    obj[key] = value
    return obj
}

function checkIfArrayNullOrEmpty(arr) {
    return arr == null || arr == undefined || (arr != null && arr != undefined && !(arr.length > 0))
}

function containsIgnoreCase(str1, str2){
    return str1.toLowerCase().includes(str2.toLowerCase())
}