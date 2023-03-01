//global-variables
let inputConfig = input.config()

//required-tables
let rtiTable = base.getTable('Real Time Inventory')
let warehouseActivityTable = base.getTable('Warehouse Activity')

//Constants
const recordIdKey = 'recordId'
const nameKey = 'name'
const fieldsKey = 'fields'
const idKey = 'id'

//Warehouse-Activity constants
const wAOrderTypeValue = 'Order'
const wALossTypeValue = 'Loss'
const wAOrderStatusField = 'Order Status'
const wAPickupOrderStatusValue = 'Pickup'
const wADeliveryOrderStatusValue = 'Delivery'

//Real-Time-Inventory constants
const rtiInventoryField = 'Inventory'
const rtiOutgoingField = 'Outgoing'

//input-config variables
let wARecordId = inputConfig.wARecordId
let wAType = inputConfig.wAType
let wAQtyDispatched = inputConfig.wAQtyDispatched
let wAOrderQty = inputConfig.wAOrderQty
let rtiRecordsArray = convertToRecordsArrayMap(
    new Map()
    .set(recordIdKey, inputConfig.rtiRecordId)
    .set(rtiInventoryField, inputConfig.rtiInventory)
    .set(rtiOutgoingField, inputConfig.rtiOutgoing)
)

//Update Real-Time-Inventory table values if its a customer order
if (wAType == wAOrderTypeValue) {

    let rtiUpdateArray = []

    rtiRecordsArray.forEach((curRtiRecord) => {

        let curRtiUpdateObj = {}

        curRtiUpdateObj[idKey] = curRtiRecord.get(recordIdKey)

        curRtiUpdateObj[fieldsKey][rtiInventoryField] = curRtiRecord.get(rtiInventoryField) - wAQtyDispatched
        curRtiUpdateObj[fieldsKey][rtiOutgoingField] = curRtiRecord.get(rtiOutgoingField) - wAOrderQty

        rtiUpdateArray.push(curRtiUpdateObj)
    })

    //update RTI table
    while (rtiUpdateArray.length > 0) {
        await rtiTable.updateRecordsAsync(rtiUpdateArray.slice(0, 50))
        rtiUpdateArray = rtiUpdateArray.slice(50)
    }
}

//update order-status in warehouse-activity
if (wAType != wALossTypeValue) {

    //construct update object
    let wAUpdateObject = {}
    wAUpdateObject[wAOrderStatusField] = {}
    wAUpdateObject[wAOrderStatusField][nameKey] = (wAType == wAOrderTypeValue) ? wADeliveryOrderStatusValue : wAPickupOrderStatusValue

    //update in table
    await warehouseActivityTable.updateRecordAsync(
        wARecordId,
        wAUpdateObject
    )

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