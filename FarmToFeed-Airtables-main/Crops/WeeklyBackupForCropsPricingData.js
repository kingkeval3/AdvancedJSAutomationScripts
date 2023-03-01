//fetch required tables
let cropDetailsTable = base.getTable('Crop Details')
let cropsPricingDataTable = base.getTable('Crops Pricing Data')

//constants
const recordIdKey = 'recordId'
const idKey = 'id'
const fieldsKey = 'fields'
const currentDate = new Date()

//Crop-Details Table Constants
const cropDetailsWPMarketField = 'WP marikiti per KG'
const cropDetailsWPLastUpdatedField = 'Last Updated (WP Markiti Price)'
const cropDetailsSellingPriceField = 'Latest Selling Price'
const cropDetailsSPLastUpdatedField = 'Last Updated (Selling Price)'
const cropDetailsBuyingPriceField = 'Buying Price FTF'
const cropDetailsBPLastUpdatedField = 'Last Updated (Buying Price)'

//Crops_Pricing-Data Table constants
const cpdCropsField = 'Crops'
const cpdDateField = 'Date'
const cpdSellingPriceField = 'Selling Price FTF'



//fetch records from table
let cropDetailsRecords = await cropDetailsTable.selectRecordsAsync({
    fields: [cropDetailsWPMarketField, cropDetailsWPLastUpdatedField,
        cropDetailsSellingPriceField, cropDetailsSPLastUpdatedField,
        cropDetailsBuyingPriceField, cropDetailsBPLastUpdatedField
    ]
})

//construct create-records array for crops-pricing-data table using data from crop-details table
let weeklyPricingArray = []
for (let curCDRecord of cropDetailsRecords.records) {

    let weeklyPricingObj = {}
    weeklyPricingObj[fieldsKey] = {}

    //Validate for null or empty fields and set in update-array

    if (!isNullOrEmptyUtil(curCDRecord.getCellValueAsString(cropDetailsWPMarketField))) {
        //Set WP markiti per KG
        weeklyPricingObj[fieldsKey][cropDetailsWPMarketField] = curCDRecord.getCellValue(cropDetailsWPMarketField)
    }

    if (!isNullOrEmptyUtil(curCDRecord.getCellValueAsString(cropDetailsWPLastUpdatedField))) {
        //Set Last Updated for WP marikiti
        weeklyPricingObj[fieldsKey][cropDetailsWPLastUpdatedField] = new Date(curCDRecord.getCellValueAsString(cropDetailsWPLastUpdatedField))
    }

    if (!isNullOrEmptyUtil(curCDRecord.getCellValueAsString(cropDetailsSellingPriceField))) {
        //Set Selling Price
        weeklyPricingObj[fieldsKey][cpdSellingPriceField] = curCDRecord.getCellValue(cropDetailsSellingPriceField)
    }

    if (!isNullOrEmptyUtil(curCDRecord.getCellValueAsString(cropDetailsSPLastUpdatedField))) {
        //Set Last Updated for Selling-Price
        weeklyPricingObj[fieldsKey][cropDetailsSPLastUpdatedField] = new Date(curCDRecord.getCellValueAsString(cropDetailsSPLastUpdatedField))
    }

    if (!isNullOrEmptyUtil(curCDRecord.getCellValueAsString(cropDetailsBuyingPriceField))) {
        //Set Buying Price
        weeklyPricingObj[fieldsKey][cropDetailsBuyingPriceField] = curCDRecord.getCellValue(cropDetailsBuyingPriceField)
    }

    if (!isNullOrEmptyUtil(curCDRecord.getCellValueAsString(cropDetailsBPLastUpdatedField))) {
        //Set Last Updated for Buying-Price
        weeklyPricingObj[fieldsKey][cropDetailsBPLastUpdatedField] = new Date(curCDRecord.getCellValueAsString(cropDetailsBPLastUpdatedField))
    }


    if (Object.keys(weeklyPricingObj[fieldsKey]).length > 0) {

        //Set Crops Field
        let cropsLinkedArray = []
        let cropsLinkedObj = {}
        cropsLinkedObj[idKey] = curCDRecord.id
        cropsLinkedArray.push(cropsLinkedObj)

        weeklyPricingObj[fieldsKey][cpdCropsField] = cropsLinkedArray

        //Set Date Field
        weeklyPricingObj[fieldsKey][cpdDateField] = currentDate

        //push set fields object to update-array
        weeklyPricingArray.push(weeklyPricingObj)
    }
}

//finalize the update array field
let cropsPricingCreateArray = convertAnyToConst(weeklyPricingArray)

//create records in crops-pricing-date table
while (cropsPricingCreateArray.length > 0) {
    await cropsPricingDataTable.createRecordsAsync(cropsPricingCreateArray.slice(0, 50))
    cropsPricingCreateArray = cropsPricingCreateArray.slice(50)
}


function convertAnyToConst(anyVariable) {
    const constVariable = anyVariable
    return constVariable
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