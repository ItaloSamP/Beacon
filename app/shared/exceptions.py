class AppException(Exception):
    status_code: int = 500
    error_code: str = "internal_error"

    def __init__(self, message: str = "", status_code: int | None = None, error_code: str | None = None):
        self.message = message
        if status_code is not None:
            self.status_code = status_code
        if error_code is not None:
            self.error_code = error_code
        super().__init__(message)

    def __str__(self):
        return self.message or self.error_code


class NotFoundException(AppException):
    status_code = 404
    error_code = "not_found"


class ConflictException(AppException):
    status_code = 409
    error_code = "conflict"


class UnauthorizedException(AppException):
    status_code = 401
    error_code = "unauthorized"


class ValidationException(AppException):
    status_code = 422
    error_code = "validation_error"


class BadRequestException(AppException):
    status_code = 400
    error_code = "bad_request"
