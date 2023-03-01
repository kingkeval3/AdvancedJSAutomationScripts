//fetch required tables
let sourcingListTable = base.getTable('Sourcing List')
let collectionSourceTable = base.getTable('Collection Source')

//Constants
const idKey = 'id'
//Sourcing List table constants
const sourcingListQtyField = 'Sourcing Volume (KGs)'
const sourcingListSupplyHubField = 'Collection Source'
const sourcingListProduceField = 'Produce'
const sourcingListPickupDateField = 'Complete Collection by'

//Select record to be split prompt (automatically selects the current record)
let record = await input.recordAsync('Chosen Record', sourcingListTable);



if (record != null) {

    //Select the number to be sliced from current record
    let toSliceNumber = await input.textAsync('Number to be sliced from selected record')

    //to be sliced number input validation
    let currentRecordQty = !isNullOrEmptyUtil(record.getCellValueAsString(sourcingListQtyField)) ? parseInt(record.getCellValueAsString(sourcingListQtyField)) : 0
    if (toSliceNumber == null || !(parseInt(toSliceNumber) <= currentRecordQty)) {
        throw Error("Please add/input valid sourcing volume to selected/split record!")
    }

    //Select Supply Hub or Farmer Below
    let supplyHubInput = undefined

    if (!isNullOrEmptyUtil(record.getCellValueAsString(sourcingListSupplyHubField))) {
        supplyHubInput = await input.recordAsync('Link Collection Source', collectionSourceTable);
    }

    //Construct create-record object
    let sourcingListSplitRecordObj = {}
    let sourcingListOriginalRecordUpdateObj = {}

    //Set Produce Field
    if (!isNullOrEmptyUtil(record.getCellValueAsString(sourcingListProduceField))) {
        let produceRecordLinkedArray = []
        let produceRecordLinkeObj = {}
        let sourcingListProduceFieldValue = record.getCellValue(sourcingListProduceField)[0]
        produceRecordLinkeObj[idKey] = sourcingListProduceFieldValue[idKey]
        produceRecordLinkedArray.push(produceRecordLinkeObj)

        sourcingListSplitRecordObj[sourcingListProduceField] = produceRecordLinkedArray
    }

    //Set Supply Hub 
    if (supplyHubInput != null) {
            let supplyHubRecordLinkedArray = []
            let supplyHubRecordLinkedObj = {}

            supplyHubRecordLinkedObj[idKey] = supplyHubInput.id
            supplyHubRecordLinkedArray.push(supplyHubRecordLinkedObj)

            sourcingListSplitRecordObj[sourcingListSupplyHubField] = supplyHubRecordLinkedArray
    }

    //Set Sourcing Volume
    sourcingListOriginalRecordUpdateObj[sourcingListQtyField] = parseInt(record.getCellValueAsString(sourcingListQtyField)) - parseInt(toSliceNumber)
    sourcingListSplitRecordObj[sourcingListQtyField] = parseInt(toSliceNumber)

    //Set Pickup-date
    if (!isNullOrEmptyUtil(record.getCellValueAsString(sourcingListPickupDateField))) {
        sourcingListSplitRecordObj[sourcingListPickupDateField] = record.getCellValue(sourcingListPickupDateField)
    }

    //Update selected record
    if (Object.keys(sourcingListOriginalRecordUpdateObj).length > 0) {
        
        await sourcingListTable.updateRecordAsync(
            record.id,
            sourcingListOriginalRecordUpdateObj
        )
    }

    //Create split-record
    if (Object.keys(sourcingListSplitRecordObj).length > 0) {
        
        await sourcingListTable.createRecordAsync(
            sourcingListSplitRecordObj
        )
    }
}
//Display Success Message
output.text('Record Split and Updated Successfully!')
output.text('Please close the Dashboard (x - top right)')


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