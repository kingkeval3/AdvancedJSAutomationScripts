let inputConfig = input.config()

//customer-order table record id
let customerOrderRecId = inputConfig.customerOrderRecId

//fetch required table(s)
let customerOrderTable = base.getTable("Customer Orders")

//customer Order table constants
const lastModifiedDateField = "Last Modified"

//customer Order Update Object
let customerOrderUpdateObj = {}
customerOrderUpdateObj[lastModifiedDateField] = new Date()

//update customer order table
await customerOrderTable.updateRecordAsync(
    customerOrderRecId,
    customerOrderUpdateObj
)