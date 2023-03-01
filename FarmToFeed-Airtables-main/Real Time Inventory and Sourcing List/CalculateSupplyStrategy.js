//global variables
let inputConfig = input.config()

//constants
const idKey = 'id'
const recordIdKey = 'recordId'
const fieldsKey = 'fields'

//Real Time Inventory Constants
const rtiKgsToBeSoldField = 'Kgs to be sold'

//Sourcing List Constants
const sourcingListProduceField = 'Produce'
const sourcingListVolumeField = 'Sourcing Volume (KGs)'
const sourcingListExpectedDeliveryDateField = 'Expected Customer Order Fulfilment Date'

//Warehouse Activity Constants
const wAOrderTypeValue = 'Order'
const wACustomerRejectedTypeValue = 'Customer Rejected'

//fetch input-config vars
let rtiUpdatedRecordId = inputConfig.rtiUpdatedRecordId
let wAType = inputConfig.wAType
let wAProduct = inputConfig.wAProduct
let wADeliveryDate = inputConfig.wADeliveryDate
let sourcingListRecIds = inputConfig.sourcingListRecordId

//fetch required table(s)
let rtiTable = base.getTable('Real Time Inventory')
let sourcingListTable = base.getTable('Sourcing List')

/*let sourcingListRecordsArray = convertToRecordsArrayMap(
    new Map()
    .set(recordIdKey, inputConfig.sourcingListRecordId)
    .set(sourcingListProduceField, inputConfig.sourcingListProduce)
    .set(sourcingListVolumeField, inputConfig.sourcingListVolume)
    .set(sourcingListExpectedDeliveryDateField, inputConfig.sourcingListExpectedDeliveryDate)
)*/


let sourcingListRecArr = []

while(sourcingListRecIds.length>0){
    let curSourcingListRecordsResultSet = await sourcingListTable.selectRecordsAsync(
        {
            fields:[sourcingListProduceField,sourcingListVolumeField,sourcingListExpectedDeliveryDateField],
            recordIds : sourcingListRecIds.slice(0,100)
        }
    )
    sourcingListRecArr = sourcingListRecArr.concat(curSourcingListRecordsResultSet.records)
    sourcingListRecIds = sourcingListRecIds.slice(100)
}


if (wAType == wAOrderTypeValue || wAType == wACustomerRejectedTypeValue) {

    //fetch sourcing list record matched by delivery date
    let sourcingListRecByExpectedDeliveryDate = fetchSourcingListRecordByExpectedDeliveryDate(sourcingListRecArr,new Date(wADeliveryDate))

    //fetch updated record from RTI
    let rtiUpdatedRecord = await rtiTable.selectRecordAsync(rtiUpdatedRecordId)

    //Calculate total-sourcing-volume
    let totalSourcingVolume = 0.0

    sourcingListRecArr.forEach((curRecord) => {

        if (!isNullOrEmptyUtil(curRecord.getCellValueAsString(sourcingListVolumeField))) {

            totalSourcingVolume = totalSourcingVolume + parseFloat(curRecord.getCellValueAsString(sourcingListVolumeField))

        }
    })

    //fetch RTI Kgs-to-be-sold
    let rtiKgsToBeSold = rtiUpdatedRecord != null && !isNullOrEmptyUtil(rtiUpdatedRecord.getCellValueAsString(rtiKgsToBeSoldField)) ?
        parseFloat(rtiUpdatedRecord.getCellValueAsString(rtiKgsToBeSoldField)) :
        0.0

    //calculate remaining-demand to be placed onto sourcing list
    let volumeToBeSourced = rtiKgsToBeSold + totalSourcingVolume

    if (volumeToBeSourced < 0) {

        volumeToBeSourced = Math.abs(volumeToBeSourced)

        //if multiple or NO sourcing-line item exists create new entry
        if (sourcingListRecByExpectedDeliveryDate == undefined || sourcingListRecByExpectedDeliveryDate == null) {

            let sourcingListCreateObject = {}

            //set product
            let produceLinkedArray = []
            let produceLinkedObj = {}
            produceLinkedObj[idKey] = wAProduct[0]
            produceLinkedArray.push(produceLinkedObj)
            sourcingListCreateObject[sourcingListProduceField] = produceLinkedArray

            //set sourcing volume
            sourcingListCreateObject[sourcingListVolumeField] = volumeToBeSourced

            //set expected delivery date
            if(!isNullOrEmptyUtil(wADeliveryDate)){
                sourcingListCreateObject[sourcingListExpectedDeliveryDateField] = wADeliveryDate
            }

            //create new entry
            await sourcingListTable.createRecordAsync(
                sourcingListCreateObject
            )

        }else{

            //update matched sourcing list record volume

            //recordId to be updated
            let sourcingListRecordToBeUpdatedId = sourcingListRecByExpectedDeliveryDate.id

            //Set updated-sourcing volume
            let currentRecSourcingVolume = sourcingListRecByExpectedDeliveryDate.getCellValueAsString(sourcingListVolumeField)
            if(!isNullOrEmptyUtil(currentRecSourcingVolume)){
                let updatedSourcingVolume = parseFloat(currentRecSourcingVolume) + volumeToBeSourced

                let sourcingListUpdateObj = {}
                sourcingListUpdateObj[sourcingListVolumeField] = updatedSourcingVolume

                //update sourcing-list record
                await sourcingListTable.updateRecordAsync(
                    sourcingListRecordToBeUpdatedId,
                    sourcingListUpdateObj
                )
            }
        }

    }

}

function fetchSourcingListRecordByExpectedDeliveryDate(sourcingListRecResultSet, expectedDeliveryDate){

    expectedDeliveryDate = expectedDeliveryDate.toDateString()

    let matchedSourcingListRecord = undefined

    for(let curSourcingListRec of sourcingListRecResultSet){
        if(!isNullOrEmptyUtil(curSourcingListRec.getCellValueAsString(sourcingListExpectedDeliveryDateField))){
            let curSourcingListRecExpectedDeliveryDate = new Date(curSourcingListRec.getCellValueAsString(sourcingListExpectedDeliveryDateField))
            if(curSourcingListRecExpectedDeliveryDate.toDateString() == expectedDeliveryDate){
                matchedSourcingListRecord = curSourcingListRec
            }
        }

    }
    return matchedSourcingListRecord
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