//configure and get input-config variables
let inputConfig = input.config()
let cropDetailsRecordId = inputConfig['recordId']

//fetch required table
let cropDetailsTable = base.getTable('Crop Details')

//Update Last-Updated date
await cropDetailsTable.updateRecordsAsync(
    [
        {
            "id":cropDetailsRecordId,
            fields:{
                "Last Updated (WP Markiti Price)":new Date()
            }
        }
    ]
)