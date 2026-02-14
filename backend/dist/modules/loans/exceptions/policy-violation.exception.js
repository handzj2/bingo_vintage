"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyViolationException = void 0;
const common_1 = require("@nestjs/common");
class PolicyViolationException extends common_1.HttpException {
    constructor(action) {
        super(`Governance Policy [2026-01-10]: ${action} is strictly prohibited for non-admin users.`, common_1.HttpStatus.FORBIDDEN);
    }
}
exports.PolicyViolationException = PolicyViolationException;
//# sourceMappingURL=policy-violation.exception.js.map