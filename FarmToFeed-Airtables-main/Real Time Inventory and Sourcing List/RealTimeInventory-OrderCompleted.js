//fetch required table(s)
let realTimeInventoryTable = base.getTable('Real Time Inventory')
let warehouseActivityTable = base.getTable('Warehouse Activity')
let expenseRegisterTable = base.getTable("Expenses Register")

//Global variables
let inputConfig = input.config()
let rtiUpdatedRecId = undefined

//Constants
let todayDate = new Date()
const idKey = 'id'
const recordIdKey = 'recordId'
const fieldsKey = 'fields'
const nameKey = 'name'

//Expense-Register table constants
const erTypeField = "Type"
const erWarehouseLossesTypeFieldValue = "Warehouse Losses"
const erWarehouseActivityField = "Warehouse Activity"

//Real Time Inventory Constants
const rtiProductField = 'Product'
const rtiInventoryField = 'Inventory'
const rtiOutgoingField = 'Outgoing'
const rtiIncomingField = 'Incoming'
const rtiDateForIncomingField = 'Date for Incoming'
const rtiKgToBeSoldField = 'Kgs to be sold'
const rtiLossField = 'Loss'
const rtiCollectedMetaDataField = 'Collected Details Meta Data'

//Warehouse Activity Constants
const wAOrderTypeValue = 'Order'
const wACustomerRejectedTypeValue = 'Customer Rejected'
const wARecievedTypeValue = 'Received'
const wAFarmerRejectedTypeValue = 'Farmer Rejected'
const wALossTypeValue = 'Loss'
const wADonationTypeValue = 'Donation'
const wAOrderStatusField = 'Order Status'
const wACreatedOrderStatusValue = 'New Order'

//fetch input-config values
let wAProduct = inputConfig['wAProduct']
let wAType = inputConfig['wAType']
let wAQty = inputConfig['wAQty']
let wAORLDate = new Date(inputConfig['wAORLDate'])
let wAPDDate = new Date(inputConfig['wAPDDate'])
let wARecordId = inputConfig.wARecordId

let rtiRecordsArray = convertToRecordsArrayMap(
    new Map()
    .set(recordIdKey, inputConfig['rtiRecordId'])
    .set(rtiProductField, inputConfig['rtiProduct'])
    .set(rtiInventoryField, inputConfig['rtiInventory'])
    .set(rtiIncomingField, inputConfig['rtiIncoming'])
    .set(rtiOutgoingField, inputConfig['rtiOutgoing'])
    .set(rtiDateForIncomingField, inputConfig['rtiDFI'])
)

let wasteProductRtiId = inputConfig.wasteProductRtiId
let wasteProductInventory = inputConfig.wasteProductInventory

//create or update obj for waste product
let rtiWasteProductCreateUpdateObj = {}
let rtiWasteProductUpdateOp = undefined
let wasteProductCount = 0.0;
if(!checkIfArrayNullOrEmpty(wasteProductRtiId)){
    rtiWasteProductCreateUpdateObj[idKey] = wasteProductRtiId[0]
    rtiWasteProductCreateUpdateObj[fieldsKey] = {}

    wasteProductCount = wasteProductInventory[0]

    rtiWasteProductUpdateOp = true

}

let lossExpenseReportCreateObj = {}
//PART-1 : Update RTI Table
//-------------------------

//if RTI record already exists update current values
if (rtiRecordsArray.length > 0) {

    //RTI Update Array
    let rtiUpdateArray = []

    rtiRecordsArray.forEach((curRtiRecord) => {
        let curRtiUpdateObj = {}

        if (curRtiRecord.get(rtiProductField) == wAProduct[0] && (wAType != wALossTypeValue ? checkIfDateComesBeforeOrAfter(wAPDDate, todayDate, false) : true)) {
            
            //update global-var
            rtiUpdatedRecId = curRtiRecord.get(recordIdKey)

            

            curRtiUpdateObj[idKey] = curRtiRecord.get(recordIdKey)
            curRtiUpdateObj[fieldsKey] = {}

            //re-calculate outgoing inventory
            if (wAType == wAOrderTypeValue || wAType == wACustomerRejectedTypeValue) {
                curRtiUpdateObj[fieldsKey][rtiOutgoingField] = curRtiRecord.get(rtiOutgoingField) + wAQty
            }

            //re-calculate incoming inventory and possibly date-for-incoming
            if (wAType == wARecievedTypeValue || wAType == wAFarmerRejectedTypeValue || wAType == wADonationTypeValue) {
                curRtiUpdateObj[fieldsKey][rtiIncomingField] = curRtiRecord.get(rtiIncomingField) + wAQty

                if (isNullOrEmptyUtil(curRtiRecord.get(rtiDateForIncomingField))) {
                    curRtiUpdateObj[fieldsKey][rtiDateForIncomingField] = wAPDDate
                }
            }

            //re-cacalculate current inventory in case of LOSS
            if (wAType == wALossTypeValue) {
                curRtiUpdateObj[fieldsKey][rtiInventoryField] = curRtiRecord.get(rtiInventoryField) - wAQty
                wasteProductCount = wasteProductCount + wAQty

                //add fields for expense register
                lossExpenseReportCreateObj[erTypeField] = getKeyValuePair(nameKey,erWarehouseLossesTypeFieldValue)
                lossExpenseReportCreateObj[erWarehouseActivityField] = [getKeyValuePair(idKey,wARecordId)]

            }

        }

        if (Object.keys(curRtiUpdateObj).length > 0 && Object.keys(curRtiUpdateObj[fieldsKey]).length > 0) {
            rtiUpdateArray.push(curRtiUpdateObj)
        }

        //include waste product update obj in update arr
        if(rtiWasteProductUpdateOp){
            rtiWasteProductCreateUpdateObj[fieldsKey][rtiInventoryField] = wasteProductCount
            rtiUpdateArray.push(rtiWasteProductCreateUpdateObj)
        }
    })

    //Update Real Time Inventory table record
    while (rtiUpdateArray.length > 0) {
        await realTimeInventoryTable.updateRecordsAsync(rtiUpdateArray.slice(0, 50))
        rtiUpdateArray = rtiUpdateArray.slice(50)
    }

    
    
}
//Otherwise create new record
else {

    //RTI Create Object
    let rtiCreateObject = {}

    //create product linked field
    let productRecordIdObj = {}
    productRecordIdObj[idKey] = wAProduct[0]
    rtiCreateObject[rtiProductField] = [productRecordIdObj]

    if (wAType != wALossTypeValue ? checkIfDateComesBeforeOrAfter(wAPDDate, todayDate, false) : true) {

        //set outgoing inventory
        if (wAType == wAOrderTypeValue || wAType == wACustomerRejectedTypeValue) {
            rtiCreateObject[rtiOutgoingField] = wAQty

            //Default values
            rtiCreateObject[rtiInventoryField] = 0.0
            rtiCreateObject[rtiIncomingField] = 0.0
        }

        //set incoming inventory and date-for-incoming
        if (wAType == wARecievedTypeValue || wAType == wAFarmerRejectedTypeValue || wAType == wADonationTypeValue) {

            rtiCreateObject[rtiIncomingField] = wAQty
            rtiCreateObject[rtiDateForIncomingField] = wAPDDate

            //Default values
            rtiCreateObject[rtiInventoryField] = 0.0
            rtiCreateObject[rtiOutgoingField] = 0.0

        }

        //set current inventory in case of LOSS
        if (wAType == wALossTypeValue) {
            rtiCreateObject[rtiInventoryField] = 0.0

            //Default values
            rtiCreateObject[rtiOutgoingField] = 0.0
            rtiCreateObject[rtiIncomingField] = 0.0

             //add fields for expense register
            lossExpenseReportCreateObj[erTypeField] = getKeyValuePair(nameKey,erWarehouseLossesTypeFieldValue)
            lossExpenseReportCreateObj[erWarehouseActivityField] = [getKeyValuePair(idKey,wARecordId)]

        }
    }

    //Create record in Real Time Inventory table
    if (Object.keys(rtiCreateObject).length > 0) {
        rtiUpdatedRecId = await realTimeInventoryTable.createRecordAsync(rtiCreateObject)
    }
}

//Update Order status in warehouse activity
if(wAType != wALossTypeValue){

    //construct update object
    let wAUpdateObject = {}
    wAUpdateObject[wAOrderStatusField] = {}
    wAUpdateObject[wAOrderStatusField][nameKey] = wACreatedOrderStatusValue

    //update in table
    await warehouseActivityTable.updateRecordAsync(
        wARecordId,
        wAUpdateObject
    )

}

if(Object.keys(lossExpenseReportCreateObj).length>0){
    await expenseRegisterTable.createRecordAsync(lossExpenseReportCreateObj)
}

//set output for the script
if(rtiUpdatedRecId!=undefined){
    output.set('rtiUpdatedRecordId',rtiUpdatedRecId)
}

function checkIfDateComesBeforeOrAfter(dateToBeChecked, dateToBeCheckedAgainst, checkBeforeFlag) {
    dateToBeChecked.setHours(0, 0, 0, 0)
    dateToBeCheckedAgainst.setHours(0, 0, 0, 0)
    return (checkBeforeFlag ? dateToBeChecked <= dateToBeCheckedAgainst : dateToBeChecked >= dateToBeCheckedAgainst)
}

function convertToRecordsArrayMap(inputConfigMap) {

    let recordsMap = new Map()

    inputConfigMap.forEach((value, key) => {

        for (let i = 0; i < value.length; i++) {

            let currentRecordDetails = recordsMap.has(i) ? recordsMap.get(i) : new Map()

            currentRecordDetails.set(key, value[i])

            recordsMap.set(i, currentRecordDetails)
        }
    })
    return [...recordsMap.values()]
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

function checkIfArrayNullOrEmpty(arr) {
    return arr == null || arr == undefined || (arr != null && arr != undefined && !(arr.length > 0))
}

function getKeyValuePair(key,value){
    let obj = {}
    obj[key] = value
    return obj
}