//configure input-config
let inputConfig = input.config()

//fetch required table(s) and their records
let customerOrdersTable = base.getTable('Customer Orders')
let fprTable = base.getTable('Farmer Payment Requests')

//Constants
//Customer Order and FPR table Constants
const fprCollectionSourceField = 'Collection Source'
const customerOrdersCustomersField = 'Customer'
const purchaseOrdersField = 'Purchase Orders'

//warehouse-activity constants
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
let wARecordId = inputConfig['wARecordId']
let wAType = inputConfig['wAType']
let wACustomer = inputConfig['wACustomer']
let wAFarmer = inputConfig['wAFarmer']

let customerOrdersRecords = convertToRecordsArrayMap(
    new Map()
    .set(recordIdKey, inputConfig['customerOrdersRecordIds'])
)

let fprRecords = convertToRecordsArrayMap(
    new Map()
    .set(recordIdKey, inputConfig['fprRecordIds'])
)

//if warehouse-activity record created is customer order
if (wAType == wAOrderTypeValue || wAType == wACustomerRejectedTypeValue) {

    if (customerOrdersRecords.length > 0) {

        //add po fields
        addPurchaseOrderFieldToCoOrFpr(customerOrdersRecords, await customerOrdersTable.selectRecordAsync(customerOrdersRecords[0].get(recordIdKey)))

        let coUpdateArray = getUpdateObjectForCoOrFpr(customerOrdersRecords)

        //update records
        while (coUpdateArray.length > 0) {
            await customerOrdersTable.updateRecordsAsync(
                coUpdateArray.slice(0, 50)
            )
            coUpdateArray = coUpdateArray.slice(50)
        }

    } else {
        //create record
        await customerOrdersTable.createRecordAsync(
            getCreateObjectForCoOrFpr(customerOrdersCustomersField)
        )

    }

}

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

    //set customer or farmers field in create object
    let customerOrFarmerLinkedFieldArray = []
    let customerOrFarmerLinkedFieldObj = {}
    customerOrFarmerLinkedFieldObj[idKey] = varyingKeyForCreate == customerOrdersCustomersField ? wACustomer : wAFarmer
    customerOrFarmerLinkedFieldArray.push(customerOrFarmerLinkedFieldObj)

    orderCreateObj[varyingKeyForCreate] = customerOrFarmerLinkedFieldArray


    return orderCreateObj
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