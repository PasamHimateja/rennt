from HAC.models import Expense
from HAC.serializers import ExpenseSerializer
from .common_service import CommonService

class ExpenseService:

    @staticmethod
    def create_expense(phone, data, files):
        owner = CommonService.get_owner(phone)
        if not owner:
            raise Exception("Owner not found")

        expense = Expense.objects.create(
            owner=owner,
            category=data.get('category'),
            description=data.get('description'),
            amount=data.get('amount'),
            date=data.get('date'),
            receipt=files.get('receipt')
        )
        return ExpenseSerializer(expense).data

    @staticmethod
    def get_expenses(phone):
        owner = CommonService.get_owner(phone)
        if not owner:
            raise Exception("Owner not found")

        expenses = Expense.objects.filter(owner=owner).order_by('-date')
        return ExpenseSerializer(expenses, many=True).data

    @staticmethod
    def update_expense(expense_id, data, files):
        try:
            expense = Expense.objects.get(id=expense_id)
        except Expense.DoesNotExist:
            raise Exception("Expense not found")

        serializer = ExpenseSerializer(expense, data=data, partial=True)
        if serializer.is_valid():
            if 'receipt' in files:
                expense.receipt = files['receipt']
            serializer.save()
            return {"message": "Expense updated successfully", "data": serializer.data}
        raise ValueError(serializer.errors)

    @staticmethod
    def delete_expense(expense_id):
        try:
            expense = Expense.objects.get(id=expense_id)
            expense.delete()
            return {"message": "Expense deleted successfully"}
        except Expense.DoesNotExist:
            raise Exception("Expense not found")

    @staticmethod
    def get_owner_expense_history(phone):
        owner = CommonService.get_owner(phone)
        if not owner:
            raise Exception("Owner not found")

        expenses = Expense.objects.filter(owner=owner).order_by('-date')
        return ExpenseSerializer(expenses, many=True).data
