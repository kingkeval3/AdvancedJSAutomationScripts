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

//Customer Shipping Addresses constants
const shippingAddrParentCustomerField = "Customer"
const shippingAddrNameField = "Shipping Address Name"
const shippingAddrContactPersonField = "Shipping Address Contact Person"
const shippingCompleteAddrField = "Shipping Complete Address"
const shippingAddrContactNoField = "Shipping Address Contact Number"
const shippingAddrCoordinatesField = "Shipping Address Coordinates"
const shippingAddrGplusField = "Shipping Address Google Plus Code"
const shippingAddrWarehouseActivityField = "Warehouse Activity"

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

let selectedCustomer = inputConfig.selectedCustomer
let selectedShippingAddressRecId = inputConfig.selectedShippingAddress

let customerOrdersRecordIds = inputConfig.customerOrdersRecordIds

let customerOrdersRecordsArrMap = convertToRecordsArrayMap(
    new Map()
    .set(recordIdKey, customerOrdersRecordIds)
)


//if warehouse-activity record created is customer order
if (wAType == wAOrderTypeValue || wAType == wACustomerRejectedTypeValue) {

    //update Customer in warehouse-activity if it doesn't exist
    let finalCustomerRecId = !checkIfArrayNullOrEmpty(wACustomer) ?
        wACustomer[0] :
        !checkIfArrayNullOrEmpty(selectedCustomer) ?
        selectedCustomer[0] :
        !checkIfArrayNullOrEmpty(wAShippingAddrParentCustomer) ?
        wAShippingAddrParentCustomer[0] :
        undefined

    let warehouseActivityUpdateObj = {}
    if (checkIfArrayNullOrEmpty(wACustomer) && !isNullOrEmptyUtil(finalCustomerRecId)) {

        //prep update obj for warehouse activity
        warehouseActivityUpdateObj[wACustomerField] = getLinkedRecordCreateValue(finalCustomerRecId)

        //update input-config
        // @ts-ignore
        wACustomer = [finalCustomerRecId]

    }

    //link shipping address record from Customer Shipping Addresses table
    let finalShippingAddrRecId = !checkIfArrayNullOrEmpty(wAShippingAddress) ?
        wAShippingAddress[0] :
        !checkIfArrayNullOrEmpty(selectedShippingAddressRecId) ?
        selectedShippingAddressRecId[0] :
        undefined

    //if no shipping address found, create new using the details sent by woocommerce
    if(isNullOrEmptyUtil(finalShippingAddrRecId) && !isNullOrEmptyUtil(finalCustomerRecId)){
        let customerShippingAddrCreateObj = {}

        customerShippingAddrCreateObj[shippingAddrParentCustomerField] = getLinkedRecordCreateValue(finalCustomerRecId)
        customerShippingAddrCreateObj[shippingAddrNameField] = wAShippingAddrName
        customerShippingAddrCreateObj[shippingAddrContactPersonField] = wAShippingAddrContactPerson
        customerShippingAddrCreateObj[shippingCompleteAddrField] = wAShippingAddrCompleteAddr
        customerShippingAddrCreateObj[shippingAddrContactNoField] = wAShippingAddrContactNo
        customerShippingAddrCreateObj[shippingAddrCoordinatesField] = wAShippingCoordinates
        customerShippingAddrCreateObj[shippingAddrGplusField] = wAShippingAddrGPlusCode
        customerShippingAddrCreateObj[shippingAddrWarehouseActivityField] = getLinkedRecordCreateValue(wARecordId)

        finalShippingAddrRecId = await customeShippingAddressTable.createRecordAsync(customerShippingAddrCreateObj)
        
        wAShippingAddress = [finalShippingAddrRecId]
    }

    if (checkIfArrayNullOrEmpty(wAShippingAddress) && !isNullOrEmptyUtil(finalShippingAddrRecId)) {

        //prep update obj for warehouse activity
        warehouseActivityUpdateObj[wAShippingAddressField] = getLinkedRecordCreateValue(finalShippingAddrRecId)

        //update input-config
        // @ts-ignore
        wAShippingAddress = [finalShippingAddrRecId]
    }

    if(Object.keys(warehouseActivityUpdateObj).length>0){
        console.log("update WA obj")
        console.log(warehouseActivityUpdateObj)
        await warehouseActivityTable.updateRecordAsync(
            wARecordId,
            warehouseActivityUpdateObj
        )
    }



    if (customerOrdersRecordsArrMap.length > 0) {

        //PATCH-WORK, in case sub customer present in warehouse-activity created order, then map to appropriate customer-order-table line item grouped by subcustomer
        let selectedCustomerRecordMap = []
        let selectedCustomerRecord = undefined

        //fetch all customer-order line items
        let customerOrderRecords = await customerOrdersTable.selectRecordsAsync({
            fields: [customerOrdersCustomersField, shippingAddressField, purchaseOrdersField],
            recordIds: customerOrdersRecordIds
        })

        //match line item with matching subcustomer from warehouse activity and set selected record
        for (let curCustomerOrderRecord of customerOrderRecords.records) {
            let curSubCustomer = curCustomerOrderRecord.getCellValue(shippingAddressField)
            if ((!checkIfArrayNullOrEmpty(curSubCustomer) && !checkIfArrayNullOrEmpty(wAShippingAddress) && curSubCustomer[0].id == wAShippingAddress[0]) ||
                (checkIfArrayNullOrEmpty(curSubCustomer) && checkIfArrayNullOrEmpty(wAShippingCoordinates))) {
                selectedCustomerRecord = curCustomerOrderRecord
                selectedCustomerRecordMap = convertToRecordsArrayMap(
                    new Map()
                    .set(recordIdKey, [curCustomerOrderRecord.id])
                )
            }

        }
        if (selectedCustomerRecord != undefined) {
            //add po fields
            addPurchaseOrderFieldToCoOrFpr(selectedCustomerRecordMap, selectedCustomerRecord)

            let coUpdateArray = getUpdateObjectForCoOrFpr(selectedCustomerRecordMap)

            //update records
            console.log("Update CO")
            console.log(coUpdateArray)
            while (coUpdateArray.length > 0) {
                await customerOrdersTable.updateRecordsAsync(
                    coUpdateArray.slice(0, 50)
                )
                coUpdateArray = coUpdateArray.slice(50)
            }

        } else {
            //create record
            let cl =  getCreateObjectForCoOrFpr(customerOrdersCustomersField)
            console.log("create co 1")
            console.log(cl)
            await customerOrdersTable.createRecordAsync(
                cl
            )

        }

    } else {
        //create record
        //create record
            let cl =  getCreateObjectForCoOrFpr(customerOrdersCustomersField)
            console.log("create co 2")
            console.log(cl)
            await customerOrdersTable.createRecordAsync(
                cl
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