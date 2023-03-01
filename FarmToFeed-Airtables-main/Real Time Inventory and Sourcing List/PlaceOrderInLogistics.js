//input-config global variables
let inputConfig = input.config()

let wARecordId = inputConfig.wARecordId
let wAType = inputConfig.wAType

//Constants
const idKey = 'id'
const nameKey = 'name'

//Warehouse activity constants 
const wACustomerOrderTypeValues = ['Order', 'Customer Rejected']
const wAFarmerOrderTypeValues = ['Received', 'Farmer Rejected', 'Donation']
const wALossTypeValue = 'Loss'

//Logistics-Schedule Constants
const logisticsTypeFieldName = 'Type'
const logisticsWAFieldName = 'Orders'
const logisticsCollectionTypeValue = 'Collection'
const logisticsDeliveryTypeValue = 'Delivery'

if (wAType != wALossTypeValue) {

    //fetch required table(s)
    let logisticsScheduleTable = base.getTable('Logistics Schedule')

    //construct logistics schedule update object
    let logisticsUpdateObj = {}

    //Set warehouse-activite/Orders column 
    let logisticsProduceLinkedObj = {}
    logisticsProduceLinkedObj[idKey] = wARecordId
    logisticsUpdateObj[logisticsWAFieldName] = [logisticsProduceLinkedObj]

    //Set Type column - Collection/Delivery
    logisticsUpdateObj[logisticsTypeFieldName] = {}
    if (wACustomerOrderTypeValues.includes(wAType)) {
        logisticsUpdateObj[logisticsTypeFieldName][nameKey] = logisticsDeliveryTypeValue
    } else if (wAFarmerOrderTypeValues.includes(wAType)) {
        logisticsUpdateObj[logisticsTypeFieldName][nameKey] = logisticsCollectionTypeValue
    }

    //create record/place order in logistics-schedule table
    if (Object.keys(logisticsUpdateObj).length > 0) {
        await logisticsScheduleTable.createRecordAsync(
            logisticsUpdateObj
        )
    }

}