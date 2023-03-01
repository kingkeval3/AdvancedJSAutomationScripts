//fetch required table(s)
let customerOrdersTable = base.getTable("Customer Orders")
let customerOrderStagingAreaView = customerOrdersTable.getView("Current Orders - Staging")
let customerShippingAddressTable = base.getTable("Customer Shipping Addresses")

//constants
const idKey = "id"
const nameKey = "name"
const fieldsKey = "fields"

//Customer Order Constants
const coCustomerField = "Customer"
const coShippingAddressField = "Shipping Address"
const coShippingCoordinatesField = "Shipping Coordinates"
const coDeliveryDateField = "Delivery Date"
const coPurchaseOrderField = "Purchase Orders"
const coIsPrimaryKey = "Is Active"
const coLastModifiedField = "Last Modified" 

//customer order staging records

let stagingViewRecResultSet = await customerOrderStagingAreaView.selectRecordsAsync(
    {
        fields: [coCustomerField,coShippingAddressField,coShippingCoordinatesField,coDeliveryDateField,coPurchaseOrderField]
    }
)

let customerShippingAddrDeliveryDateMap = {}
let processedPoArrIds = []
let deleteCoRecordIds = []

let usedShippingAddressRecordIds = []
let deleteShippingAddressRecordIds = []

for(let curCoStagedRec of stagingViewRecResultSet.records){

    let curCoStagedRecCustomer = curCoStagedRec.getCellValue(coCustomerField)
    let curCoStagedRecShippingAddr = curCoStagedRec.getCellValue(coShippingAddressField)
    let curCoStagedRecShippingCoordinates = curCoStagedRec.getCellValueAsString(coShippingCoordinatesField)
    let curCoStagedRecDeliveryDate = curCoStagedRec.getCellValueAsString(coDeliveryDateField)
    let curCoStagedRecPurchaseOrder = curCoStagedRec.getCellValue(coPurchaseOrderField)



    if(!checkIfArrayNullOrEmpty(curCoStagedRecCustomer) && (!checkIfArrayNullOrEmpty(curCoStagedRecShippingAddr) || !isNullOrEmptyUtil(curCoStagedRecShippingCoordinates)) && !checkIfArrayNullOrEmpty(curCoStagedRecPurchaseOrder)){
        
        let mapKey = curCoStagedRecCustomer[0].id+"-"+curCoStagedRecShippingCoordinates+"-"+curCoStagedRecDeliveryDate

        if(customerShippingAddrDeliveryDateMap.hasOwnProperty(mapKey)){

            let mapValue = customerShippingAddrDeliveryDateMap[mapKey][fieldsKey]
            let curPoArray = mapValue[coPurchaseOrderField]
            
            //console.log(curCoStagedRecPurchaseOrder)
            curPoArray = curPoArray.concat(processPurchaseOrderCellValue(curCoStagedRecPurchaseOrder))

            mapValue[coPurchaseOrderField] = curPoArray

            customerShippingAddrDeliveryDateMap[mapKey][fieldsKey] = mapValue

            if(!usedShippingAddressRecordIds.includes(curCoStagedRecShippingAddr[0].id)){
                deleteShippingAddressRecordIds.push(curCoStagedRecShippingAddr[0].id)
            }

        }else{
            customerShippingAddrDeliveryDateMap[mapKey] = {}
            customerShippingAddrDeliveryDateMap[mapKey][fieldsKey] = {}
            customerShippingAddrDeliveryDateMap[mapKey][fieldsKey][coCustomerField] = [getKeyValuePair(idKey,curCoStagedRecCustomer[0].id)]
            customerShippingAddrDeliveryDateMap[mapKey][fieldsKey][coShippingAddressField] = [getKeyValuePair(idKey,curCoStagedRecShippingAddr[0].id)]
            //console.log(curCoStagedRecPurchaseOrder)
            customerShippingAddrDeliveryDateMap[mapKey][fieldsKey][coPurchaseOrderField] = processPurchaseOrderCellValue(curCoStagedRecPurchaseOrder)
            customerShippingAddrDeliveryDateMap[mapKey][fieldsKey][coIsPrimaryKey] = true
            customerShippingAddrDeliveryDateMap[mapKey][fieldsKey][coLastModifiedField] = new Date()

            if(!usedShippingAddressRecordIds.includes(curCoStagedRecShippingAddr[0].id)){
                usedShippingAddressRecordIds.push(curCoStagedRecShippingAddr[0].id)
            }
        }

    }

    deleteCoRecordIds.push(curCoStagedRec.id)
}

while(deleteCoRecordIds.length>0){
    await customerOrdersTable.deleteRecordsAsync(deleteCoRecordIds.slice(0,50))
    deleteCoRecordIds = deleteCoRecordIds.slice(50)
}

let coCreateArr = Object.values(customerShippingAddrDeliveryDateMap)

while(coCreateArr.length>0){
    await customerOrdersTable.createRecordsAsync(coCreateArr.slice(0,50))
    coCreateArr = coCreateArr.slice(50)
}

//delete duplicate shipping address
while(deleteShippingAddressRecordIds.length>0){
    await customerShippingAddressTable.deleteRecordsAsync(deleteShippingAddressRecordIds.slice(0,50))
    deleteShippingAddressRecordIds = deleteShippingAddressRecordIds.slice(50)
}

function checkIfArrayNullOrEmpty(arr) {
    return arr == null || (arr != null && !(arr.length > 0))
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

function getKeyValuePair(key,value){
    let obj = {}
    obj[key] = value
    return obj
}

function processPurchaseOrderCellValue(poCellValue){
    let poCreateUpdateArr = []
    if(!checkIfArrayNullOrEmpty(poCellValue)){
        for(let curLinkedPo of poCellValue){
            if(!processedPoArrIds.includes(curLinkedPo.id)){
                poCreateUpdateArr.push(getKeyValuePair(idKey,curLinkedPo.id))
                processedPoArrIds.push(curLinkedPo.id)
            }
        }
    }
    return poCreateUpdateArr
}