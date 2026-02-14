import { HttpException } from '@nestjs/common';
export declare class PolicyViolationException extends HttpException {
    constructor(action: string);
}
