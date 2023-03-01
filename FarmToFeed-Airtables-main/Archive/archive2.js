let farmersTable = base.getTable('Farmers')
let geoLocationsTable = base.getTable('GeoLocation')

const googlePlusCodeField = 'Google Plus Code'
const currentFarmLocationField = 'Current Farm Location'
const farmOwnershipField = 'Farm Ownership'
const farmSizeField = 'Farm Size (Acres)'
const farmingPracticesField = 'Farming Practices'
const farmingTypeField = 'Farming Type'
const irrigationTypeField = 'Irrigation Type'
const distanceToLocalMarketField = 'Distance To Local Market (KM)'
const farmMarketField = 'Farm Market'
const transportationModeField = 'Transportation Mode'
const farmDetailsAndLocationsField = 'Farm Details and Locations'
const farmersField = 'Farmers'

const idKey = 'id'
const nameKey = 'name'
const fieldsKey = 'fields'

var farmerRecords = await farmersTable.selectRecordsAsync({
    fields: [currentFarmLocationField, farmOwnershipField, farmSizeField, farmingPracticesField, farmingTypeField, irrigationTypeField, distanceToLocalMarketField, farmDetailsAndLocationsField,farmMarketField,transportationModeField]
})

let farmDetailsLocationsCreateArray = []
let farmDetailsLocationsUpdateArray = []

for (let curFarmerRecord of farmerRecords.records) {

    let farmeDetailsAndLocationCreateOrUpdateObj = prepareFarmLocationsFieldArray(curFarmerRecord)

    let curFarmDetailsAndLocations = curFarmerRecord.getCellValue(farmDetailsAndLocationsField)

    //create new farm data entry obj in geolocations table if not present already
    if (checkIfArrayNullOrEmpty(curFarmDetailsAndLocations)) {

        if (farmeDetailsAndLocationCreateOrUpdateObj != null && Object.keys(farmeDetailsAndLocationCreateOrUpdateObj).length > 0) {
            let fieldsCreateObj = {}
            fieldsCreateObj[fieldsKey] = farmeDetailsAndLocationCreateOrUpdateObj
            farmDetailsLocationsCreateArray.push(fieldsCreateObj)
        }

    }
    //else update current farm location entries in geo-location table
    else {

        if (curFarmDetailsAndLocations.length == 1 && farmeDetailsAndLocationCreateOrUpdateObj != null && Object.keys(farmeDetailsAndLocationCreateOrUpdateObj).length > 0) {
            let fieldsUpdateObj = {}
            fieldsUpdateObj[idKey] = curFarmDetailsAndLocations[0][idKey]
            fieldsUpdateObj[fieldsKey] = farmeDetailsAndLocationCreateOrUpdateObj
            farmDetailsLocationsUpdateArray.push(fieldsUpdateObj)
        }

    }
}

let finalCreateArr = convertAnyToConst(farmDetailsLocationsCreateArray)
let finalUpdateArr = convertAnyToConst(farmDetailsLocationsUpdateArray)

let createdRecordIds = []
let updatedRecordIds = []

//debug-lines
//console.log(finalCreateArr)
//console.log(finalUpdateArr)


while (finalCreateArr.length > 0) {
    let currentlyCreatedIds = await geoLocationsTable.createRecordsAsync(finalCreateArr.slice(0, 50))
    finalCreateArr = finalCreateArr.slice(50)
    createdRecordIds = createdRecordIds.concat(currentlyCreatedIds)
}

while (finalUpdateArr.length > 0) {
    let currentlyUpdatedIds = await geoLocationsTable.updateRecordsAsync(finalUpdateArr.slice(0, 50))
    finalUpdateArr = finalUpdateArr.slice(50)
    updatedRecordIds.concat(currentlyUpdatedIds)
}

console.log(createdRecordIds)
console.log(updatedRecordIds)

function createSingleSelectCreateObj(singleSelectObj) {
    let singleSelectCreateObj = {}
    if (singleSelectObj != null) {
        singleSelectCreateObj[nameKey] = singleSelectObj[nameKey]
    }
    return singleSelectCreateObj
}

function createMultiSelectCreateObj(multiSelectObjArr) {
    let multiSelectCreateArr = []
    if (!checkIfArrayNullOrEmpty(multiSelectObjArr)) {
        for (let curSelectedObj of multiSelectObjArr) {
            let newSelectedObj = {}
            newSelectedObj[nameKey] = curSelectedObj[nameKey]
            multiSelectCreateArr.push(newSelectedObj)
        }
    }

    return multiSelectCreateArr
}

function createLinkedRecordObj(recordId) {
    let linkedRecordArr = []
    let linkedRecordObj = {}
    linkedRecordObj[idKey] = recordId
    linkedRecordArr.push(linkedRecordObj)
    return linkedRecordArr
}

function checkIfArrayNullOrEmpty(arr) {
    return arr == null || (arr != null && !(arr.length > 0))
}

function convertAnyToConst(anyVariable) {
    const constVariable = anyVariable
    return constVariable
}

function prepareFarmLocationsFieldArray(curFarmerRecord) {
    let createObj = {}

    //Set google-plus
    if (curFarmerRecord.getCellValue(currentFarmLocationField) != null) {
        createObj[googlePlusCodeField] = curFarmerRecord.getCellValueAsString(currentFarmLocationField)
    }
    
    //set farm-ownership
    if (curFarmerRecord.getCellValue(farmOwnershipField) != null) {
        createObj[farmOwnershipField] = createSingleSelectCreateObj(curFarmerRecord.getCellValue(farmOwnershipField))
    }

    //set farm-size
    if (curFarmerRecord.getCellValue(farmSizeField) != null) {
        createObj[farmSizeField] = curFarmerRecord.getCellValue(farmSizeField)
    }

    //set farming-practices
    if (curFarmerRecord.getCellValue(farmingPracticesField) != null) {
        createObj[farmingPracticesField] = createSingleSelectCreateObj(curFarmerRecord.getCellValue(farmingPracticesField))
    }
    
    //set farming-type
    if (curFarmerRecord.getCellValue(farmingTypeField) != null) {
        createObj[farmingTypeField] = createSingleSelectCreateObj(curFarmerRecord.getCellValue(farmingTypeField))
    }

    //set transportation-mode
    if (curFarmerRecord.getCellValue(transportationModeField) != null) {
        createObj[transportationModeField] = createSingleSelectCreateObj(curFarmerRecord.getCellValue(transportationModeField))
    }

    //set irrigation-type
    if (curFarmerRecord.getCellValue(irrigationTypeField) != null) {
        createObj[irrigationTypeField] = createSingleSelectCreateObj(curFarmerRecord.getCellValue(irrigationTypeField))
    }

    //set farm-market
    let currentFarmMarketValue = curFarmerRecord.getCellValue(farmMarketField)
    if (!checkIfArrayNullOrEmpty(currentFarmMarketValue)) {
        createObj[farmMarketField] = createMultiSelectCreateObj(currentFarmMarketValue)
    }

    //set distance-to-local-market
    if (curFarmerRecord.getCellValue(distanceToLocalMarketField) != null) {
        createObj[distanceToLocalMarketField] = curFarmerRecord.getCellValue(distanceToLocalMarketField)
    }

    //link the farmer
    if (Object.keys(createObj).length > 0) {
        createObj[farmersField] = createLinkedRecordObj(curFarmerRecord.id)
    }

    return createObj
}