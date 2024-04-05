type JSONValue =
  | string
  | number
  | boolean
  | object
  | null
  | JSONObject
  | JSONArray;

type JSONObject = { [key: string]: JSONValue };

type JSONArray = JSONValue[];

export { JSONArray, JSONValue, JSONObject };
