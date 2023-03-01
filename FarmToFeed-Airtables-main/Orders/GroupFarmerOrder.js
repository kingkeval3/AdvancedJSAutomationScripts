//configure input-config
let inputConfig = input.config()

//fetch required table(s) and their records
let warehouseActivityTable = base.getTable('Warehouse Activity')
let customerOrdersTable = base.getTable('Customer Orders')
let fprTable = base.getTable('Farmer Orders')
let customeShippingAddressTable = base.getTable("Customer Shipping Addresses")

//Constants
//Customer Order and FPR table Constants
const fprCollectionSourceField = 'Collection Source'
const customerOrdersCustomersField = 'Customer'
const purchaseOrdersField = 'Purchase Orders'
const shippingCoordinatesField = 'Shipping Coordinates'
const orderStatusField = 'Order Status'
const newOrderStatusValue = 'New Order'
const shippingAddressField = "Shipping Address"


//warehouse-activity constants
const wACustomerField = 'Customer'
const wAShippingAddressField = "Shipping Address"
const wAOrderTypeValue = 'Order'
const wACustomerRejectedTypeValue = 'Customer Rejected'
const wARecievedTypeValue = 'Received'
const wAFarmerRejectedTypeValue = 'Farmer Rejected'
const wALossTypeValue = 'Loss'
const wADonationTypeValue = 'Donation'


//const keys
const idKey = 'id'
const recordIdKey = 'recordId'
const fieldsKey = 'fields'
const nameKey = 'name'

//fetch input-config variables
let wARecordId = inputConfig.wARecordId
let wAType = inputConfig.wAType

let wACustomer = inputConfig.wACustomer
let wAFarmer = inputConfig.wAFarmer

let wAShippingAddress = inputConfig.wAShippingAddress
let wAShippingAddrParentCustomer = inputConfig.wAShippingAddrParentCustomer
let wAShippingAddrName = inputConfig.wAShippingAddrName
let wAShippingAddrContactPerson = inputConfig.wAShippingAddrContactPerson
let wAShippingAddrCompleteAddr = inputConfig.wAShippingAddrCompleteAddr
let wAShippingAddrContactNo = inputConfig.wAShippingAddrContactNo
let wAShippingCoordinates = inputConfig.wAShippingCoordinates
let wAShippingAddrGPlusCode = inputConfig.wAShippingAddrGPlusCode



let fprRecords = convertToRecordsArrayMap(
    new Map()
    .set(recordIdKey, inputConfig['fprRecordIds'])
)

//if warehouse-activity record created is farmer order or donation
if (wAType == wARecievedTypeValue || wAType == wAFarmerRejectedTypeValue || wAType == wADonationTypeValue) {

    if (fprRecords.length > 0) {

        //add po fields
        addPurchaseOrderFieldToCoOrFpr(fprRecords, await fprTable.selectRecordAsync(fprRecords[0].get(recordIdKey)))

        let fprUpdateArray = getUpdateObjectForCoOrFpr(fprRecords)

        //update records
        while (fprUpdateArray.length > 0) {
            await fprTable.updateRecordsAsync(
                fprUpdateArray.slice(0, 50)
            )
            fprUpdateArray = fprUpdateArray.slice(50)
        }
    } else {
        //create records
        await fprTable.createRecordAsync(
            getCreateObjectForCoOrFpr(fprCollectionSourceField)
        )
    }

}



function getUpdateObjectForCoOrFpr(orderRecords) {

    let orderCreateOrUpdateArray = []

    orderRecords.forEach((curOrder) => {

        let orderUpdateObj = {}

        //set recordId to be updated
        orderUpdateObj[idKey] = curOrder.get(recordIdKey)
        orderUpdateObj[fieldsKey] = {}

        //set PO fields to be updated
        let poArray = curOrder.has(purchaseOrdersField) ? curOrder.get(purchaseOrdersField) : []
        let poObj = {}
        poObj[idKey] = wARecordId
        poArray.push(poObj)

        orderUpdateObj[fieldsKey][purchaseOrdersField] = poArray

        //add update obj to update array
        orderCreateOrUpdateArray.push(orderUpdateObj)

    })

    return orderCreateOrUpdateArray
}


function getCreateObjectForCoOrFpr(varyingKeyForCreate) {

    let orderCreateObj = {}

    //Set purchase orders field in create object
    let poLinkedFieldArray = []
    let poLinkedFieldObj = {}
    poLinkedFieldObj[idKey] = wARecordId
    poLinkedFieldArray.push(poLinkedFieldObj)

    orderCreateObj[purchaseOrdersField] = poLinkedFieldArray

    let flag = varyingKeyForCreate == customerOrdersCustomersField

    //set customer or farmers field in create object
    orderCreateObj[varyingKeyForCreate] = getLinkedRecordCreateValue(flag ? wACustomer[0] : wAFarmer[0])

    //set sub-customer field in case its a customer order
    if (flag) {

        orderCreateObj[shippingAddressField] = getLinkedRecordCreateValue(wAShippingAddress[0])

        //Set Order Status
        let orderStatusValueObj = {}
        orderStatusValueObj[nameKey] = newOrderStatusValue
        orderCreateObj[orderStatusField] = orderStatusValueObj
    }

    return orderCreateObj
}

function getLinkedRecordCreateValue(recordId) {
    let linkedArr = []
    let linkedIdObj = {}
    linkedIdObj[idKey] = recordId
    linkedArr.push(linkedIdObj)
    return linkedArr
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

function addPurchaseOrderFieldToCoOrFpr(recordsArray, selectedRecord) {
    recordsArray.forEach((curRecord) => {

        let poLinkedArray = selectedRecord.getCellValue(purchaseOrdersField)
        poLinkedArray.forEach(function(curPO) {
            delete curPO[nameKey]
        });

        curRecord.set(purchaseOrdersField, poLinkedArray)

    })
}

function convertAnyToConst(anyVariable) {
    const constVariable = anyVariable
    return constVariable
}

function checkIfArrayNullOrEmpty(arr) {
    return arr == null || (arr != null && !(arr.length > 0))
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