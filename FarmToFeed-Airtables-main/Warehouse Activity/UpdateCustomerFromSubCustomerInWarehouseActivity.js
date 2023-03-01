//Fetch required tables
let customerTable = base.getTable('Customers')
let subCustomerTable = base.getTable('Sub Customers')
let warehouseActivityTable = base.getTable('Warehouse Activity')

//Get input config (input variables) object
let inputConfig = input.config();
let warehouseActivityRecordId = inputConfig.warehouseActivityRecordId
let warehouseActivitySubCustomer = inputConfig.warehouseActivitySubCustomer

//SubCustomers required Field Names
let subCustomerMatchFieldName = 'Customer Subsidiary'
let subCustomerParentCustomerFieldName = 'Parent Customer'

//Fetch records from Sub Customers table
var subCustomerTableRecords = await subCustomerTable.selectRecordsAsync({
    fields: [subCustomerMatchFieldName, subCustomerParentCustomerFieldName]
});

let subCustomerParentCustomerValue = undefined

//Iterate and match record from subcustomer if exists
for (let curRecord of subCustomerTableRecords.records) {

    //Match the records by that field
    if (curRecord.getCellValueAsString(subCustomerMatchFieldName) == warehouseActivitySubCustomer[0]) {
        subCustomerParentCustomerValue = curRecord.getCellValueAsString(subCustomerParentCustomerFieldName)
        break;
    }
}

//Customer Field Names
let customerMatchFieldName = 'CUSTOMER'

//Fetch records from Customers table
var customerTableRecords = await customerTable.selectRecordsAsync({
    fields: [customerMatchFieldName]
});

let customerMatchedRecordId = undefined

//Iterate and match record from customer if exists
for (let curRecord of customerTableRecords.records) {

    //Match the records by that field
    if (curRecord.getCellValueAsString(customerMatchFieldName) == subCustomerParentCustomerValue) {
        customerMatchedRecordId = curRecord.id
        break;
    }
}

//Update the linked customer record in  Warehouse Activity
if (customerMatchedRecordId != undefined) {
    await warehouseActivityTable.updateRecordsAsync([{
        "id": warehouseActivityRecordId,
        fields: {
            "Customer": [{
                id: customerMatchedRecordId
            }]
        }
    }])
}