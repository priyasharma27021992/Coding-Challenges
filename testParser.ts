import { JsonParser } from "./json-parser";

const input = '{"result":true, "count":42}';
const output = new JsonParser(input).parse();
