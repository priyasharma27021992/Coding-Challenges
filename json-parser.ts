import { EscapeToken, NumberToken, Token } from "./token";
import { JSONArray, JSONObject, JSONValue } from "./types";

const CONTROL_CHARACTERS_REGEX =
  /[\u0000-\u001F\u007F-\u009F\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;

const FAILURE_EXIT_CODE = 1;
const SUCCESS_EXIT_CODE = 0;

export class JsonParser {
  private pos = 0;
  private input: string;

  constructor(input: string) {
    this.input = input;
  }

  public parse(): JSONValue {
    this.consumeWhiteSpace();

    const value = this.parseValue();

    this.consumeWhiteSpace();

    if (this.hasNext()) {
      console.log(
        `Unexpected token ${this.currentToken()}at position ${this.pos}`
      );
      process.exit(FAILURE_EXIT_CODE);
    }

    console.log("Parsed successfully %s", value);
    process.exit(SUCCESS_EXIT_CODE);
  }

  private consumeWhiteSpace() {
    while (/\s/.test(this.currentToken())) {
      this.consume();
    }
  }

  private parseValue(): JSONValue {
    switch (this.currentToken()) {
      case Token.BEGIN_OBJECT:
        return this.parseObject();
      case Token.BEGIN_ARRAY:
        return this.parseArray();
      case Token.QUOTE:
        return this.parseString();
      case Token.BEGIN_TRUE:
        return this.parseTrue();
      case Token.BEGIN_FALSE:
        return this.parseFalse();
      case Token.BEGIN_NULL:
        return this.parseNull();
      case NumberToken.ZERO:
      case NumberToken.ONE:
      case NumberToken.TWO:
      case NumberToken.THREE:
      case NumberToken.FOUR:
      case NumberToken.FIVE:
      case NumberToken.SIX:
      case NumberToken.SEVEN:
      case NumberToken.EIGHT:
      case NumberToken.NINE:
      case NumberToken.MINUS:
        return this.parseNumber();
      default:
        console.log(
          `Unexpected token ${this.currentToken()} at position ${this.pos}`
        );
        process.exit(FAILURE_EXIT_CODE);
    }
  }

  private parseObject(): JSONObject {
    const obj: JSONObject = {};
    this.consume(Token.BEGIN_OBJECT);

    let morePairs = null;

    while (this.currentToken() !== Token.END_OBJECT || morePairs) {
      const pair = this.parsePair();
      obj[pair.key] = pair.value;

      if (this.currentToken() === Token.COMMA) {
        this.consume(Token.COMMA);
        morePairs = true;
      } else if (this.currentToken() !== Token.END_OBJECT) {
        morePairs = false;
        console.log(`Invalid object at position ${this.pos}`);
        process.exit(FAILURE_EXIT_CODE);
      } else {
        morePairs = false;
      }
    }
    this.consume(Token.END_OBJECT);
    return obj;
  }

  private parsePair(): { key: string; value: JSONValue } {
    const key = this.parseString();
    this.consume(Token.SEMI_COLON);
    const value = this.parseValue();
    return { key, value };
  }

  private parseString(): string {
    let str = "";
    this.consume(Token.QUOTE);

    while (this.currentToken() !== Token.QUOTE) {
      if (this.currentToken() == Token.ESCAPE) {
        str += this.parseEscape();
      } else {
        if (this.isControlCode()) {
          console.log(
            `Invalid charater at ${this.pos}. Control charaters must be escaped`
          );
          process.exit(FAILURE_EXIT_CODE);
        }
        str += this.currentToken();
        this.pos++;
      }
    }

    this.consume(Token.QUOTE);
    return str;
  }

  private parseEscape(): string {
    this.consume(Token.ESCAPE, false);

    if (this.isControlCode()) {
      console.log(`Invalid escape character at ${this.pos}`);
      process.exit(FAILURE_EXIT_CODE);
    }

    switch (this.currentToken()) {
      case EscapeToken.QUOTE:
      case EscapeToken.REVERSE_SOLIDUS:
      case EscapeToken.SOLIDUS:
        const c = this.currentToken();
        this.consume();
        return c;
      case EscapeToken.BACKSPACE:
        this.consume();
      case EscapeToken.FORM_FEED:
        this.consume();
      case EscapeToken.LINE_FEED:
        this.consume();
        return Token.LINE_FEED;
      case EscapeToken.CAR_RETURN:
        this.consume();
        return Token.CAR_RETURN;
      case EscapeToken.HORIZONTAL_TAB:
        this.consume();
        return Token.HORIZONTAL_TAB;
      case EscapeToken.HEX: {
        this.consume();
        const code = parseInt(this.input.substring(this.pos, this.pos + 4), 16);

        if (isNaN(code)) {
          console.log(`Invalid hex code at position ${this.pos}`);
          process.exit(FAILURE_EXIT_CODE);
        }

        this.pos += 4;
        return String.fromCharCode(code);
      }
      default:
        console.log(`Invalid escape charater at position ${this.pos}`);
        process.exit(FAILURE_EXIT_CODE);
    }
  }

  private isControlCode(): boolean {
    return CONTROL_CHARACTERS_REGEX.test(this.currentToken());
  }

  private consume(expected?: string, skip: boolean = true) {
    if (expected && this.currentToken() !== expected) {
      console.log(
        `Expected ${expected} but found ${this.currentToken()} at position ${
          this.pos
        }`
      );
      process.exit(FAILURE_EXIT_CODE);
    }

    this.pos++;

    if (skip) {
      //   skip over any whitespaces
      while (
        this.currentToken() === " " ||
        this.currentToken() === "\t" ||
        this.currentToken() === "\n" ||
        this.currentToken() === "\r"
      ) {
        this.pos++;
      }
    }
  }

  private currentToken(): string {
    return this.input.charAt(this.pos);
  }

  private parseArray(): JSONArray {
    const arr: JSONArray = [];
    this.consume(Token.BEGIN_ARRAY);

    let morePairs = null;

    while (this.currentToken() !== Token.END_ARRAY || morePairs) {
      const value = this.parseValue();
      arr.push(value);

      if (this.currentToken() === Token.COMMA) {
        this.consume(Token.COMMA);
        morePairs = true;
      } else if (this.currentToken() !== Token.END_ARRAY) {
        morePairs = false;
        console.log(
          `Invalid array at position ${
            this.pos
          }, currentToken: ${this.input.substring(this.pos - 2, this.pos + 2)}`
        );
        process.exit(FAILURE_EXIT_CODE);
      } else {
        morePairs = false;
      }
    }

    this.consume(Token.END_ARRAY);
    return arr;
  }

  private parseTrue(): boolean {
    this.consume("t");
    this.consume("r");
    this.consume("u");
    this.consume("e");
    return true;
  }

  private parseFalse(): boolean {
    this.consume("f");
    this.consume("a");
    this.consume("l");
    this.consume("s");
    this.consume("e");
    return false;
  }

  private parseNull(): null {
    this.consume("n");
    this.consume("u");
    this.consume("l");
    this.consume("l");
    return null;
  }

  private parseNumber(): number {
    let str = "";

    if (this.currentToken() === NumberToken.MINUS) {
      str += this.currentToken();
      this.consume(NumberToken.MINUS);
    }

    str += this.parseDigits();

    if (this.currentToken() === NumberToken.DOT) {
      str += this.currentToken();
      this.consume(NumberToken.DOT);
      str += this.parseDigits(true);
    }

    if (
      this.currentToken() === NumberToken.SMALL_EXPONENT ||
      this.currentToken() === NumberToken.CAPITAL_EXPONENT
    ) {
      str += this.currentToken();
      this.consume();
      if (
        this.currentToken() == NumberToken.PLUS ||
        this.currentToken() == NumberToken.MINUS
      ) {
        str += this.currentToken();
        this.consume();
      }

      str += this.parseDigits(true);
    }
    return parseFloat(str);
  }

  private parseDigits(allowMultipleZerosAtPrefix: boolean = false): string {
    let str = "";
    if (this.currentToken() === NumberToken.ZERO) {
      str += this.currentToken();
      this.consume(NumberToken.ZERO);

      if (allowMultipleZerosAtPrefix) {
        while (this.currentToken() === NumberToken.ZERO) {
          str += this.currentToken();
          this.consume(NumberToken.ZERO);
        }
      }
    } else if (
      this.currentToken() >= NumberToken.ONE &&
      this.currentToken() <= NumberToken.NINE
    ) {
      str += this.currentToken();
      this.consume();

      while (
        this.currentToken() >= NumberToken.ZERO &&
        this.currentToken() <= NumberToken.NINE
      ) {
        str += this.currentToken();
        this.consume();
      }
    } else {
      console.log(
        `Invalid character ${this.currentToken()} at position ${this.pos}\n
        parsed ${str} till now`
      );
      process.exit(FAILURE_EXIT_CODE);
    }
    return str;
  }

  private hasNext(): boolean {
    this.consumeWhiteSpace();
    return this.input.codePointAt(this.pos) !== undefined;
  }
}
