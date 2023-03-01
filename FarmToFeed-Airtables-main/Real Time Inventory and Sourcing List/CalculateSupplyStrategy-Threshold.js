//Constants
const recordIdKey = 'recordId'
const idKey = 'id'

//CropDetails constants
const cropDetailsFinalQtyKey = 'Final Qty'
const cropDetailsThresholdKey = 'Threshold'

//Sourcing List Constants
const sourcingListProduceField = 'Produce'
const sourcingListVolumeField = 'Sourcing Volume (KGs)'

//configure input-variables
let inputConfig = input.config()


//fetch input-config variable
let rtiProduceRecordId = inputConfig.rtiProduct[0]
let rtiInventory = inputConfig.rtiInventory

let sourcingListRecordsArray = convertToRecordsArrayMap(
    new Map()
    .set(recordIdKey, inputConfig.sourcingListRecordId)
    .set(sourcingListVolumeField, inputConfig.sourcingListVolume)
)


//fetch required tables
let cropDetailsTable = base.getTable('Crop Details')
let sourcingListTable = base.getTable('Sourcing List')

//fetch record
let cropDetailProduceRecord = await cropDetailsTable.selectRecordAsync(rtiProduceRecordId)


if (cropDetailProduceRecord != null || cropDetailProduceRecord != undefined) {

    let cropDetailsThreshold = cropDetailProduceRecord.getCellValue(cropDetailsThresholdKey)
    let cropDetailsFinalQty = cropDetailProduceRecord.getCellValue(cropDetailsFinalQtyKey)

    if (!isNullOrEmptyUtil(cropDetailsThreshold)) {

        if (rtiInventory < cropDetailsThreshold) {
            //if multiple or NO sourcing-line item exists create new entry
            if (sourcingListRecordsArray.length == 0 || sourcingListRecordsArray.length > 1) {

                let sourcingListCreateObject = {}

                //set product
                let produceLinkedArray = []
                let produceLinkedObj = {}
                produceLinkedObj[idKey] = rtiProduceRecordId
                produceLinkedArray.push(produceLinkedObj)
                sourcingListCreateObject[sourcingListProduceField] = produceLinkedArray

                //set sourcing volume
                sourcingListCreateObject[sourcingListVolumeField] = cropDetailsFinalQty

                //create new entry
                await sourcingListTable.createRecordAsync(
                    sourcingListCreateObject
                )

            }

            //if only one sourcing-line item exists update current entry
            if (sourcingListRecordsArray.length == 1) {

                //recordId to be updated
                let sourcingListRecordToBeUpdatedId = sourcingListRecordsArray[0].get(recordIdKey)

                //Set updated-sourcing volume
                let updatedSourcingVolume = parseFloat(sourcingListRecordsArray[0].get(sourcingListVolumeField)) + cropDetailsFinalQty

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