//fetch required table(s)
let contactListTable = base.getTable('Contact List')
let collectionSourceTable = base.getTable('Collection Source')
let farmersTable = base.getTable('Farmers')

//Constants
const idKey = 'id'
const recordIdKey = 'recordId'
const fieldsKey = 'fields'
const nameKey = 'name'

//Farmers Table constants
const farmerNameFarmersHeader = 'Farmer Name'
const isPrimaryFarmersHeader = 'Is Primary'
const phoneNoFarmerHeader = 'Phone Number'
const farmerTypeFarmerHeader = 'Farmer Type'
const contactListFarmerHeader = 'Contact List'
const referenceFarmerHeader = 'Reference'
const emailFarmerHeader = 'Email'
const farmLocationHeader = "Farm Details and Locations"

//Contact List Table constants
const contactNameHeaderFrmContactList = 'Contact Name'
const contactNoHeaderFrmContactList = 'Contact Number'
const altContactNoHeaderFrmContactList = 'Alternative Contact Number'
const farmerHeaderFrmContactList = 'Is Farmer Contact?'
const emailHeaderFrmContactList = 'Email'

//Collection Source Constants
const typeCollectionSourceField = 'Type'
const farmersCollectionSourceField = 'Farmers'
const contactDetailsCollectionSourceField = 'Contact Details'
const supplyHubTypeCollectionSourceValue = 'Supply Hub'
const sourcingManagerTypeCollectionSourceValue = 'Sourcing Manager'
const geoLocationCollectionSourceField = "GeoLocation"


//congigure global variable input-config
let inputConfig = input.config()

let farmerCollectionSource = inputConfig.farmerCollectionSources

if (farmerCollectionSource != null && farmerCollectionSource.length > 0) {

    let collectionSourceRecord = await collectionSourceTable.selectRecordAsync(farmerCollectionSource[0])

    if (collectionSourceRecord != null) {

        let collectionSourceType = collectionSourceRecord.getCellValueAsString(typeCollectionSourceField)

        if (![sourcingManagerTypeCollectionSourceValue].includes(collectionSourceType)) {

            let collectionSourceRecordId = collectionSourceRecord.id
            let collectionSourceFarmers = collectionSourceRecord.getCellValue(farmersCollectionSourceField)
            let collectionSourceContacts = collectionSourceRecord.getCellValue(contactDetailsCollectionSourceField)
            let farmerPhones = inputConfig.farmerPhones

            let farmerRecordIdList = inputConfig.farmerRecordIds
            let requiredColumnsFrmFarmers = [farmerNameFarmersHeader, farmerTypeFarmerHeader, phoneNoFarmerHeader, isPrimaryFarmersHeader, contactListFarmerHeader, referenceFarmerHeader, emailFarmerHeader, farmLocationHeader]

            //Prepare recordsArrMap
            let farmersRecords = [];
            if (farmerRecordIdList.length > 0 && requiredColumnsFrmFarmers.length > 0) {

                let tableRecords = await farmersTable.selectRecordsAsync({
                    fields: requiredColumnsFrmFarmers,
                    recordIds: farmerRecordIdList
                })

                for (let curRecord of tableRecords.records) {
                    let recordsMap = new Map()
                    recordsMap.set(recordIdKey, curRecord.id)
                    requiredColumnsFrmFarmers.forEach((curKey) => {

                        let value = undefined

                        //If field is of type single select
                        if (curKey == farmerTypeFarmerHeader) {
                            value = curRecord.getCellValue(farmerTypeFarmerHeader) != null ?
                                curRecord.getCellValue(farmerTypeFarmerHeader)[nameKey] :
                                ""
                        }
                        //If field is of type linked-record
                        else if (curKey == contactListFarmerHeader || curKey == referenceFarmerHeader) {
                            value = []
                            let curLinkedRecord = curRecord.getCellValue(curKey)
                            if (curLinkedRecord != null) {
                                curLinkedRecord.forEach((curLinkedRec) => {
                                    value.push(curLinkedRec[idKey])
                                })
                            }
                            //for other types (i.e boolean, string, number)
                        } else {
                            value = curRecord.getCellValue(curKey)
                        }

                        recordsMap.set(
                            curKey,
                            value
                        )
                    })

                    farmersRecords.push(recordsMap)
                }
            }

            let collectionSourceType = undefined
            let collectionSourceContactListUpdateArr = []
            let contactListCreateArr = []

            let collectionSourceFarmerContactIds = []

            //primary farmer geolocation rec id
            let primaryFarmerLocRecId = undefined

            farmersRecords.forEach((curFarmerRecord) => {

                let isPrimaryFarmer = (!isNullOrEmptyUtil(curFarmerRecord.get(isPrimaryFarmersHeader)) && curFarmerRecord.get(isPrimaryFarmersHeader))

                //Get location info id if farmer is primart
                if (isPrimaryFarmer) {
                    primaryFarmerLocRecId = curFarmerRecord.get(farmLocationHeader)[0]
                }


                if (collectionSourceFarmers.length == 1 || isPrimaryFarmer) {

                    //collect farmer contact ids
                    collectionSourceFarmerContactIds.push(curFarmerRecord.get(contactListFarmerHeader)[0])

                    if (curFarmerRecord.get(contactListFarmerHeader) != null && curFarmerRecord.get(contactListFarmerHeader).length > 0) {

                        collectionSourceContactListUpdateArr.push(
                            curFarmerRecord.get(contactListFarmerHeader)[0]
                        )


                    } else {

                        let contactListCreateObj = {}
                        contactListCreateObj[fieldsKey] = {}
                        contactListCreateObj[fieldsKey][contactNameHeaderFrmContactList] = curFarmerRecord.get(farmerNameFarmersHeader)
                        contactListCreateObj[fieldsKey][contactNoHeaderFrmContactList] = curFarmerRecord.get(phoneNoFarmerHeader)
                        contactListCreateObj[fieldsKey][farmerHeaderFrmContactList] = [createRecordIdObject(curFarmerRecord.get(recordIdKey))]
                        contactListCreateObj[fieldsKey][emailHeaderFrmContactList] = curFarmerRecord.get(emailFarmerHeader)
                        contactListCreateArr.push(contactListCreateObj)
                    }

                    collectionSourceType = curFarmerRecord.get(farmerTypeFarmerHeader)

                    //add primary farmer reference to contact list update array for collection-source
                    if (curFarmerRecord.get(referenceFarmerHeader) != null && curFarmerRecord.get(referenceFarmerHeader).length > 0) {

                        collectionSourceContactListUpdateArr.push(
                            curFarmerRecord.get(contactListFarmerHeader)[0]
                        )

                    }

                }

            })

            //create unavailable farmers contact in Contact List table
            let contactListCreatedIds = []
            while (contactListCreateArr.length > 0) {
                let newlyCreatedContactsIds = await contactListTable.createRecordsAsync(contactListCreateArr.slice(0, 50))
                contactListCreateArr = contactListCreateArr.slice(50)
                contactListCreatedIds = contactListCreatedIds.concat(newlyCreatedContactsIds)

                collectionSourceFarmerContactIds = collectionSourceFarmerContactIds.concat(newlyCreatedContactsIds)
            }

            //add newly created primary farmers contact ids to collection source update array
            let collectionSourceExistingContactsIds = []
            collectionSourceContacts.forEach((curContactObj) => {
                if (!collectionSourceFarmerContactIds.includes(curContactObj[idKey])) {
                    collectionSourceExistingContactsIds.push(curContactObj[idKey])
                }
            })

            collectionSourceContactListUpdateArr = mergeAndCreateUniqueElementsArray(collectionSourceExistingContactsIds, collectionSourceContactListUpdateArr.concat(contactListCreatedIds))

            collectionSourceContactListUpdateArr = collectionSourceContactListUpdateArr.map(curEle => createRecordIdObject(curEle))

            //create update object for collection-source table
            //Update contact details for collections source using collected ContactList table record ids
            //update-object for CollectionSource table
            let collectionSourceUpdateObj = {}
            collectionSourceUpdateObj[contactDetailsCollectionSourceField] = collectionSourceContactListUpdateArr
            collectionSourceUpdateObj[typeCollectionSourceField] = {}
            if (collectionSourceFarmers.length > 1) {
                collectionSourceUpdateObj[typeCollectionSourceField][nameKey] = supplyHubTypeCollectionSourceValue
            } else {
                if (!isNullOrEmptyUtil(collectionSourceType)) {
                    collectionSourceUpdateObj[typeCollectionSourceField][nameKey] = collectionSourceType
                } else {
                    if (farmersRecords.length > 0) {
                        collectionSourceUpdateObj[typeCollectionSourceField][nameKey] = farmersRecords[0].get(farmerTypeFarmerHeader)
                    }
                }
            }

            if (!isNullOrEmptyUtil(primaryFarmerLocRecId)) {
                collectionSourceUpdateObj[geoLocationCollectionSourceField] = [getKeyValuePair(idKey, primaryFarmerLocRecId)]
            }

            //update CollectionSource table
            await collectionSourceTable.updateRecordAsync(
                collectionSourceRecordId,
                collectionSourceUpdateObj
            )

        }
    }
}


function createRecordIdObject(id) {
    let createRecordIdObject = {}
    createRecordIdObject[idKey] = id
    return createRecordIdObject
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

function removeElementFromArray(element, array) {
    const index = array.indexOf(element);
    if (index > -1) {
        array.splice(index, 1);
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

function mergeAndCreateUniqueElementsArray(a, b) {
    let c = a.concat(b)
    return c.filter((item, pos) => c.indexOf(item) === pos)
}

function getKeyValuePair(key, value) {
    let obj = {}
    obj[key] = value
    return obj
}