# Java 입문 교재 — 2장: 페이지 경계 테스트

이 문서는 **코드 블럭이 페이지 경계를 넘어가는 경우**를 테스트하기 위한 것입니다.
아래 `BankAccount` 예제는 일부러 길게 작성되어 100% 화면에서 1페이지를 넘어 2페이지까지 이어집니다.
이 긴 블럭 전체를 드래그로 선택한 뒤 변환했을 때, 페이지에 걸쳐 쪼개진 표에서도 줄번호·구문강조·다크박스가 잘 유지되는지 확인하세요.

```java
public class BankAccount {
    private String owner;
    private long balance;

    public BankAccount(String owner, long initial) {
        this.owner = owner;
        this.balance = initial;
    }

    // 입금: 금액이 0보다 커야 한다
    public void deposit(long amount) {
        if (amount <= 0) {
            throw new IllegalArgumentException("입금액은 0보다 커야 합니다");
        }
        this.balance += amount;
        System.out.println(owner + "님 입금 완료: " + amount + "원");
    }

    // 출금: 잔액이 충분해야 한다
    public boolean withdraw(long amount) {
        if (amount <= 0) {
            throw new IllegalArgumentException("출금액은 0보다 커야 합니다");
        }
        if (this.balance < amount) {
            System.out.println("잔액 부족! 현재 잔액: " + this.balance + "원");
            return false;
        }
        this.balance -= amount;
        System.out.println(owner + "님 출금 완료: " + amount + "원");
        return true;
    }

    public long getBalance() {
        return this.balance;
    }

    public static void main(String[] args) {
        BankAccount account = new BankAccount("홍길동", 10000);
        account.deposit(5000);
        boolean ok = account.withdraw(20000);
        if (!ok) {
            account.withdraw(3000);
        }
        System.out.println("최종 잔액: " + account.getBalance() + "원");
    }
}
```

위 코드는 은행 계좌의 입금과 출금을 간단히 구현한 예제입니다. 페이지 경계를 넘는 긴 코드도 잘 변환되는지 확인하는 것이 이 테스트의 목적입니다.
