export class APIError extends Error {
  constructor(message, request,reason) {
    super(message)
    this.request = request
    this.reason = reason
  }
};
