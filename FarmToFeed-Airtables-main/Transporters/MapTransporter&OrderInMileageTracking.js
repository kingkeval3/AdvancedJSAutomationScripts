//fetch required table(s)
let mileageTrackingTable = base.getTable('Mileage Tracking')
let customerOrderTable = base.getTable('Customer Orders')
let farmerOrderTable = base.getTable('Farmer Orders')

//Constants
const idKey = 'id'

//Mileage Tracking table constants
const transporterFieldName = "Transporter"
const wagePerKmFieldName = "Wage per KM"
const firstMileFieldName = 'First Mile'
const lastMileFieldName = 'Last Mile'
const firstMileTransportationTypeValue = 'First Mile'
const lastMileTransportationTypeValue = 'Last Mile'
const transportTypeFieldName = "Transport Type"
const firstMileTransportTypeValue = "0"
const lastMileTransportTypeValue = "1"

//input config
var inputConfig = input.config()

//input-config values
//InputConfig from -  find records from Transporters
let transporterRecordIds = inputConfig.transporterRecordIds
let transporterWagePerKm = inputConfig.transporterWagePerKm

//InputConfig from - new mileage tracking table record
let mileageTrackingRecordId = inputConfig.mileageTrackingRecordId
let mileageTrackingOrderIds = inputConfig.mileageTrackingOrderIds
let mileageTrackingTransportationType = inputConfig.mileageTrackingTransportationType

//start constructing update object for mileage-tracking table
let mtUpdateObj = {}


//map transporter to mileage tracking
if (!checkIfArrayNullOrEmpty(transporterRecordIds)) {
    mtUpdateObj[transporterFieldName] = [getKeyValueObj(idKey, transporterRecordIds[0])]
}

//wage-per km snapshot
if (!checkIfArrayNullOrEmpty(transporterWagePerKm) && !checkIfArrayNullOrEmpty(transporterWagePerKm[0])) {
    mtUpdateObj[wagePerKmFieldName] = transporterWagePerKm[0][0]
}

let mtUpdateObjBackup = deepCloneObj(mtUpdateObj)

let processed = false

//update mileage-tracking table
try {

    //possible faulty values for fields - First Mile Field OR Last Mile Field
    if (Object.keys(mtUpdateObj).length > 0) {
        await mileageTrackingTable.updateRecordAsync(
            mileageTrackingRecordId,
            mtUpdateObj
        )
        processed = true
    }
} catch(err) {
/*
    if (Object.keys(mtUpdateObjBackup).length > 0) {
        await mileageTrackingTable.updateRecordAsync(
            mileageTrackingRecordId,
            mtUpdateObjBackup
        )
    }*/
}
//custom-catch-block
if(!processed){
    if (Object.keys(mtUpdateObjBackup).length > 0) {
        await mileageTrackingTable.updateRecordAsync(
            mileageTrackingRecordId,
            mtUpdateObjBackup
    )
    }
    
}

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

function checkIfArrayNullOrEmpty(arr) {
    return arr == null || (arr != null && !(arr.length > 0))
}

function getKeyValueObj(key, value) {
    let obj = {}
    obj[key] = value
    return obj
}

function containsIgnoreCase(str1, str2) {
    return str1.toLowerCase().includes(str2.toLowerCase())
}

function deepCloneObj(obj){
    const objClone = JSON.parse(JSON.stringify(obj));
    return objClone
}