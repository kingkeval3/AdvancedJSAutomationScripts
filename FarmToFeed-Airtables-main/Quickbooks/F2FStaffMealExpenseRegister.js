//input-config
var inputConfig = input.config()

//Input Config flow values
let inventoryDeductionRecId = inputConfig.inventoryDeductionRecId
let inventoryDeductionProductId = inputConfig.inventoryDeductionProductId
let inventoryDeductionProductQty = inputConfig.inventoryDeductionProductQty
let inventoryDeductionReason = inputConfig.inventoryDeductionReason

let rtiRecId = inputConfig.rtiRecId
let rtiCurrentInventory = inputConfig.rtiCurrentInventory

let erRecId = inputConfig.erRecId
let erInventoryDeductionInfo = inputConfig.erInventoryDeductionInfo

//fetch required table(s)
let rtiTable = base.getTable("Real Time Inventory")
let expenseRegisterTable = base.getTable("Expenses Register")

//Constants
const idKey = "id"
const nameKey = "name"
const fieldsKey = "fields"

//RTI table constants
const rtiProductField = "Product"
const rtiInventoryField = "Inventory"

//Expense Register table constants
const erDateField = "Date"
const erTypeField = "Type"
const erInventoryDeductionInfoField = "Inventory Deduction Info"

//Update Real Time Inventory Table
if(!checkIfArrayNullOrEmpty(rtiRecId)){

    let rtiUpdateObj = {}
    rtiUpdateObj[rtiInventoryField] = rtiCurrentInventory[0] > inventoryDeductionProductQty ? (rtiCurrentInventory[0] - inventoryDeductionProductQty) : (inventoryDeductionProductQty - rtiCurrentInventory[0])

    await rtiTable.updateRecordAsync(
        rtiRecId[0],
        rtiUpdateObj
    )

}else{
    //create record in Real Time Inventory if record doesn't exist 
    let rtiCreateObj = {}
    rtiCreateObj[rtiProductField] = [getKeyValueObj(idKey,inventoryDeductionProductId[0])]
    rtiCreateObj[rtiInventoryField] = 0 - inventoryDeductionProductQty

    await rtiTable.createRecordAsync(rtiCreateObj)
}

//Update Expense Register
if(!checkIfArrayNullOrEmpty(erRecId)){
    let erUpdateObj = {}
    
    let erInventoryDeductionInfoLinkedArr = []

    //add existing linked rec ids
    if(!checkIfArrayNullOrEmpty(erInventoryDeductionInfo)){
        for(let curErInventoryDeductionInfoLinkedRecId of erInventoryDeductionInfo){
            erInventoryDeductionInfoLinkedArr.push(
                getKeyValueObj(idKey,curErInventoryDeductionInfoLinkedRecId)
            )
        }
    }

    //tag current inventory-deduction-info table rec id
    erInventoryDeductionInfoLinkedArr.push(
        getKeyValueObj(idKey,inventoryDeductionRecId)
    )
    erUpdateObj[erInventoryDeductionInfoField] = erInventoryDeductionInfoLinkedArr
    
    await expenseRegisterTable.updateRecordAsync(
        erRecId[0],
        erUpdateObj
    )
}else{
    let erCreateObj = {}
    erCreateObj[erDateField] = new Date()
    erCreateObj[erTypeField] = getKeyValueObj(nameKey,inventoryDeductionReason)
    erCreateObj[erInventoryDeductionInfoField] = [getKeyValueObj(idKey,inventoryDeductionRecId)]

    await expenseRegisterTable.createRecordAsync(erCreateObj)
}


function checkIfArrayNullOrEmpty(arr) {
    return arr == null || arr == undefined || (arr != null && arr != undefined && !(arr.length > 0))
}

function convertAnyToConst(anyVariable) {
    const constVariable = anyVariable
    return constVariable
}

function getKeyValueObj(key, value) {
    let obj = {}
    obj[key] = value
    return obj
}