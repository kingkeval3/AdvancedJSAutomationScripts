//Fetch Required tables
let supplyHubSourcingTable = base.getTable('Supply Hub Sourcing')

//Get input config (input variables) object
let inputConfig = input.config();

//Required fields of record from Warehouse Activity
let warehouseActivityRecordId = inputConfig.warehouseActivityRecordId
let warehouseActivityProduct = inputConfig.warehouseActivityProduct
let warehouseActivitySupplyHub = inputConfig.warehouseActivitySupplyHub
let warehouseActivityDate = new Date(inputConfig.warehouseActivityDate)
let warehouseActivityQty = inputConfig.warehouseActivityQty

//construct {Month-Name Year} format
let warehouseActivityDateInMonthYear = warehouseActivityDate.toLocaleString('default', {
    month: 'long'
}) + " " + warehouseActivityDate.getFullYear()

//Set required matching variables
let supplyHubSourcingMatchFieldName = 'Supply Hub to Crop'
let supplyHubSourcingCapacity = 'Capacity by KG'
let supplyHubSourcingMatchValue = warehouseActivitySupplyHub + ' - ' + warehouseActivityProduct + ' for ' + warehouseActivityDateInMonthYear


//Fetch records from supply hub sourcing table
var supplyHubSourcingRecords = await supplyHubSourcingTable.selectRecordsAsync({
    fields: [supplyHubSourcingMatchFieldName, supplyHubSourcingCapacity]
});

var newOrExistingRecord = undefined
//Iterate and match record if exists
for (let curRecord of supplyHubSourcingRecords.records) {

    //Match the records by that field
    if (curRecord.getCellValueAsString(supplyHubSourcingMatchFieldName) == supplyHubSourcingMatchValue) {
        newOrExistingRecord = curRecord
        break;
    }
}

//If existing record, then update capacity
if (newOrExistingRecord != undefined) {
    let supplyHubSourcingRecordId = newOrExistingRecord.id
    var capacity = newOrExistingRecord.getCellValue(supplyHubSourcingCapacity)
    capacity = capacity + warehouseActivityQty

    await supplyHubSourcingTable.updateRecordsAsync([{
        "id": supplyHubSourcingRecordId,
        fields: {
            'Capacity by KG': capacity
        }
    }])
}
//if no record exists, create new record
else {

    //Fetch Linked records IDs from their respective tables
    let supplyHubTable = base.getTable('Supply Hub')
    let cropDetailsTable = base.getTable('Crop Details')

    let cropDetailsMatchField = 'Crop To Grade'
    let supplyHubMatchField = 'Supply Hub'

    var supplyHubTableRecords = await supplyHubTable.selectRecordsAsync({
        fields: [supplyHubMatchField]
    });
    var cropDetailsTableRecords = await cropDetailsTable.selectRecordsAsync({
        fields: [cropDetailsMatchField]
    });

    //Linked record id variables
    let supplyHubRecordId = undefined
    let cropDetailsRecordId = undefined

    //Iterate through the records and match
    for (let curRecord of supplyHubTableRecords.records) {
        if (curRecord.getCellValueAsString(supplyHubMatchField) == warehouseActivitySupplyHub[0]) {
            supplyHubRecordId = curRecord.id
            break;
        }
    }


    for (let curRecord of cropDetailsTableRecords.records) {
        if (curRecord.getCellValueAsString(cropDetailsMatchField) == warehouseActivityProduct[0]) {
            cropDetailsRecordId = curRecord.id
            break;
        }
    }

    if (supplyHubRecordId != undefined && cropDetailsRecordId != undefined) {
        await supplyHubSourcingTable.createRecordAsync({
            "Supply Hub": [{
                id: supplyHubRecordId
            }],
            "Produce": [{
                id: cropDetailsRecordId
            }],
            "Date": warehouseActivityDate,
            "Capacity by KG": warehouseActivityQty
        })
    }

}