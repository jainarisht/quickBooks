/**
 *  Xooa Quickbooks Logger Chaincode
 *
 *  Copyright 2018 Xooa
 *
 *  Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
 *  in compliance with the License. You may obtain a copy of the License at:
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed
 *  on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License
 *  for the specific language governing permissions and limitations under the License.
 */
/*
 * Original source via IBM Corp:
 *  https://hyperledger-fabric.readthedocs.io/en/release-1.2/chaincode4ade.html#pulling-it-all-together
 *
 * Modifications from: Arisht Jain:
 *  https://github.com/xooa/integrations
 */

package main

import (
	"bytes"
	"fmt"
	"strconv"

	"github.com/hyperledger/fabric/core/chaincode/shim"
	"github.com/hyperledger/fabric/protos/peer"
)

var logger = shim.NewLogger("quickBooksCC")

// SimpleAsset implements a simple chaincode to manage an asset
type SimpleAsset struct {
}

// Init is called during chaincode instantiation to initialize any
// data. Note that chaincode upgrade also calls this function to reset
// or to migrate data.
func (t *SimpleAsset) Init(stub shim.ChaincodeStubInterface) peer.Response {
	logger.Debug("Init() called.")
	return shim.Success(nil)
}

// Invoke is called per transaction on the chaincode. Each transaction is
// either updating the state or retreiving the state created by Init function.
func (t *SimpleAsset) Invoke(stub shim.ChaincodeStubInterface) peer.Response {
	logger.Debug("Invoke() called.")
	// Extract the function and args from the transaction proposal
	function, args := stub.GetFunctionAndParameters()

	if function == "saveNewEvent" {
		return t.saveNewEvent(stub, args)
	} else if function == "getEntityDetails" {
		return t.getEntityDetails(stub, args)
	} else if function == "getHistoryForEntity" {
		return t.getHistoryForEntity(stub, args)
	} else if function == "saveNewOauth2" {
		return t.saveNewOauth2(stub, args)
	} else if function == "getOauth2" {
		return t.getOauth2(stub, args)
	}

	logger.Error("Function declaration not found for ", function)
	resp := shim.Error("Invalid function name : " + function)
	resp.Status = 404
	return resp
}

// saveNewEvent stores the event on the ledger. For each entity,
// it will override the current state with the new one
func (t *SimpleAsset) saveNewEvent(stub shim.ChaincodeStubInterface, args []string) peer.Response {
	logger.Debug("saveNewEvent() called.")

	// Essential check to verify number of arguments
	if len(args) != 4 {
		logger.Error("Incorrect number of arguments passed in saveNewEvent.")
		resp := shim.Error("Incorrect number of arguments. Expecting 4 arguments: " + strconv.Itoa(len(args)) + " given.")
		resp.Status = 400
		return resp
	}
	realmId := args[0]
	entity := args[1]
	key := args[2]
	if realmId == "" || entity == "" || key == "" {
		logger.Error("Empty key passed to saveNewEvent()")
		resp := shim.Error("Key must not be empty.")
		resp.Status = 400
		return resp
	} else {
		arr := []string{realmId, entity, key}
		myCompositeKey, err := stub.CreateCompositeKey("realm~entity~key", arr)

		eventJSONasString := args[3]
		logger.Debug("eventJSONasString: ", eventJSONasString)
		eventJSONasBytes := []byte(eventJSONasString)

		keyAsString := `{"realmId": "` + realmId + `", "details": "` + eventJSONasString + `"}`
		keyAsBytes := []byte(keyAsString)
		err = stub.SetEvent("saveNewEvent", keyAsBytes)
		if err != nil {
			logger.Error("Error occured while calling SetEvent(): ", err)
		}

		err = stub.PutState(myCompositeKey, eventJSONasBytes)
		if err != nil {
			logger.Error("Error occured while calling PutState(): ", err)
			return shim.Error("Error in updating ledger.")
		}
	}
	return shim.Success([]byte(key))
}

// main function starts up the chaincode in the container during instantiate
func main() {
	logger.Debug("main() called.")
	if err := shim.Start(new(SimpleAsset)); err != nil {
		logger.Error("Error starting SimpleAsset chaincode: ", err)
		fmt.Printf("Error starting SimpleAsset chaincode: %s", err)
	}
}

// getHistoryForEntity queries the entity using realmId, entity and its id.
// It retrieve all the changes to the entity happened over time.
func (t *SimpleAsset) getHistoryForEntity(stub shim.ChaincodeStubInterface, args []string) peer.Response {
	logger.Debug("getHistoryForEntity called.")

	// Essential check to verify number of arguments
	if len(args) != 3 {
		logger.Error("Incorrect number of arguments passed in getHistoryForEntity.")
		resp := shim.Error("Incorrect number of arguments. Expecting 3 arguments: " + strconv.Itoa(len(args)) + " given.")
		resp.Status = 400
		return resp
	}

	realmId := args[0]
	entity := args[1]
	key := args[2]
	arr := []string{realmId, entity, key}
	myCompositeKey, err := stub.CreateCompositeKey("realm~entity~key", arr)
	resultsIterator, err := stub.GetHistoryForKey(myCompositeKey)

	if err != nil {
		logger.Error("Error occured while calling GetHistoryForKey(): ", err)
		return shim.Error("Failed to get history for " + entity + "entity with id = " + key)
	}
	defer resultsIterator.Close()

	// buffer is a JSON array containing historic values for the event
	var buffer bytes.Buffer
	buffer.WriteString("[")

	bArrayMemberAlreadyWritten := false
	for resultsIterator.HasNext() {
		response, err := resultsIterator.Next()
		if err != nil {
			return shim.Error("Error occured while calling getHistoryForEntity (resultsIterator): " + err.Error())
		}
		// Add a comma before array members, suppress it for the first array member
		if bArrayMemberAlreadyWritten == true {
			buffer.WriteString(",")
		}
		buffer.WriteString("{\"TxId\":")
		buffer.WriteString("\"")
		buffer.WriteString(response.TxId)
		buffer.WriteString("\"")

		buffer.WriteString(", \"Value\":")
		buffer.WriteString(string(response.Value))
	}
	buffer.WriteString("]")

	return shim.Success(buffer.Bytes())
}

// getEntityDetails queries using realmId, entity and its key.
// It retrieves the latest state of the entity.
func (t *SimpleAsset) getEntityDetails(stub shim.ChaincodeStubInterface, args []string) peer.Response {
	logger.Debug("getEntityDetails called.")
	var err error

	// Essential check to verify number of arguments
	if len(args) != 3 {
		logger.Error("Incorrect number of arguments passed in getEntityDetails.")
		resp := shim.Error("Incorrect number of arguments. Expecting 3 arguments: " + strconv.Itoa(len(args)) + " given.")
		resp.Status = 400
		return resp
	}

	realmId := args[0]
	entity := args[1]
	key := args[2]
	arr := []string{realmId, entity, key}
	myCompositeKey, err := stub.CreateCompositeKey("realm~entity~key", arr)

	valueAsBytes, err := stub.GetState(myCompositeKey)
	if err != nil {
		logger.Error("Error occured while calling GetState(): ", err)
		return shim.Error("Failed to get state for " + entity + "entity with id = " + key)
	}
	if valueAsBytes == nil {
		logger.Info("No data received for " + entity + "entity with id = " + key)
		resp := shim.Error("nil result got for " + entity + "entity with id = " + key)
		resp.Status = 400
		return resp
	}
	return shim.Success(valueAsBytes)
}

// saveNewOauth2 stores the oauth2 token on the ledger. For each realmId,
// it will override the current state with the new one
func (t *SimpleAsset) saveNewOauth2(stub shim.ChaincodeStubInterface, args []string) peer.Response {
	logger.Debug("saveNewOauth2() called.")
	if len(args) != 2 {
		logger.Error("Incorrect number of arguments passed in saveNewOauth2.")
		resp := shim.Error("Incorrect number of arguments. Expecting 2 arguments: " + strconv.Itoa(len(args)) + " given.")
		resp.Status = 400
		return resp
	}
	realmId := args[0]
	token := args[1]
	logger.Debug("token: ", token)

	tokenAsBytes := []byte(token)
	if realmId == "" {
		logger.Error("Empty key passed to saveNewResponse()")
		resp := shim.Error("Key must not be empty.")
		resp.Status = 400
		return resp
	} else {
		err := stub.PutState(realmId, tokenAsBytes)
		if err != nil {
			logger.Error("Error occured while calling PutState(): ", err)
			return shim.Error("Error in updating ledger.")
		}
	}
	return shim.Success([]byte(realmId))
}

// getOauth2 queries using realmId.
// It retrieves the latest stored oauth key for the realmId.
func (t *SimpleAsset) getOauth2(stub shim.ChaincodeStubInterface, args []string) peer.Response {
	logger.Debug("getOauth2 called.")
	var err error

	if len(args) != 1 {
		logger.Error("Incorrect number of arguments passed in getOauth2.")
		resp := shim.Error("Incorrect number of arguments. Expecting 1 argument: " + strconv.Itoa(len(args)) + " given.")
		resp.Status = 400
		return resp
	}

	realmId := args[0]

	valueAsBytes, err := stub.GetState(realmId)

	if err != nil {
		logger.Error("Error occured while calling GetState(): ", err)
		return shim.Error("Failed to get oauth2 for " + realmId)
	}
	if valueAsBytes == nil {
		logger.Info("No data received for " + realmId + "realmId.")
		resp := shim.Error("nil result got for " + realmId + "realmId.")
		resp.Status = 400
		return resp
	}
	return shim.Success(valueAsBytes)
}
